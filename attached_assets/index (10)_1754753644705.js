const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');
const unzipper = require('unzipper');
const crypto = require('crypto');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const nodemailer = require('nodemailer');
const youtubeDl = require('youtube-dl-exec');

require('./cleaner');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use('/zips', express.static('zips'));
app.use(express.json());

function generateNamespace() {
  return [...Array(32)].map(() => Math.random().toString(36)[2]).join('');
}

function escapePath(filePath) {
  return `"${filePath.replace(/"/g, '\\"')}"`;
}

const progressClients = new Map();

// ตั้งค่า email transporter (ใช้ Gmail SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // ใส่อีเมลของคุณใน Secrets
    pass: process.env.EMAIL_PASS  // ใส่ App Password ของ Gmail ใน Secrets
  }
});

// ฟังก์ชันส่งอีเมลแจ้งเตือน
async function sendNotificationEmail(email, textureName, downloadUrl) {
  if (!email) return;

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `🎮 Texture Pack "${textureName}" พร้อมแล้ว!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">🎉 Texture Pack ของคุณพร้อมแล้ว!</h2>
          <p>สวัสดีครับ!</p>
          <p>Texture Pack "<strong>${textureName}</strong>" ของคุณได้สร้างเสร็จแล้ว</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${downloadUrl}" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 8px; font-weight: bold;">
              📦 ดาวน์โหลดเลย
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">
            หมายเหตุ: ลิงก์นี้จะหมดอายุภายใน 24 ชั่วโมง
          </p>
          <hr>
          <p style="color: #888; font-size: 12px;">
            ขอบคุณที่ใช้บริการ BetMC UI Generator!
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ ส่งอีเมลแจ้งเตือนไปยัง ${email} แล้ว`);
  } catch (error) {
    console.error('❌ ไม่สามารถส่งอีเมลได้:', error);
  }
}

app.get('/progress/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  progressClients.set(sessionId, res);

  req.on('close', () => {
    progressClients.delete(sessionId);
  });
});

function sendProgress(sessionId, step, progress, message, timeLeft = null) {
  const client = progressClients.get(sessionId);
  if (client) {
    const data = { step, progress, message, timeLeft };
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

// ฟังก์ชันดาวน์โหลดวิดีโอจาก YouTube
async function downloadYouTubeVideo(videoId, outputPath, quality = '720') {
  try {
    let format;
    switch (quality) {
      case '480':
        format = 'best[height<=480]';
        break;
      case '720':
        format = 'best[height<=720]';
        break;
      case '1080':
        format = 'best[height<=1080]';
        break;
      default:
        format = 'best[height<=720]';
    }

    await youtubeDl(`https://www.youtube.com/watch?v=${videoId}`, {
      format: format,
      output: outputPath
    });
  } catch (error) {
    throw new Error('ไม่สามารถดาวน์โหลดวิดีโอจาก YouTube ได้');
  }
}

// ฟังก์ชันดาวน์โหลดเสียงจาก YouTube
async function downloadYouTubeAudio(videoId, outputPath) {
  try {
    await youtubeDl(`https://www.youtube.com/watch?v=${videoId}`, {
      format: 'bestaudio[ext=m4a]',
      output: outputPath
    });
  } catch (error) {
    throw new Error('ไม่สามารถดาวน์โหลดเสียงจาก YouTube ได้');
  }
}

app.post('/upload', upload.fields([
  { name: 'video' },
  { name: 'audio' },
  { name: 'icon' },
  // ไม่รับ manifest และ sounds_zip upload แล้ว
]), async (req, res) => {
  const sessionId = generateNamespace();

  try {
    const fps = parseFloat(req.body.fps);
    const quality = parseInt(req.body.quality);
    const textureName = req.body.textureName || 'Custom Texture';
    const userEmail = req.body.email;
    const youtubeVideoId = req.body.youtubeVideoId;
    const youtubeQuality = req.body.youtubeQuality || '720';
    const useYoutubeAudio = req.body.useYoutubeAudio === 'true';
    const youtubeAudioId = req.body.youtubeAudioId;

    if (isNaN(fps) || isNaN(quality)) {
      return res.status(400).json({ error: 'Invalid fps or quality value' });
    }

    // ส่ง sessionId กลับไปก่อน
    res.json({ sessionId });

    const namespace = generateNamespace();
    const outputDir = path.join('output', namespace);
    const frameDir = path.join(outputDir, 'subpacks/1080/betmc_background/betmc_background_frame');
    fs.mkdirSync(frameDir, { recursive: true });

    sendProgress(sessionId, 1, 5, 'เริ่มต้นการประมวลผล...');

    let videoPath;
    let audioPath;

    // ตรวจสอบว่าเป็น YouTube video หรือไฟล์อัปโหลด
    if (youtubeVideoId) {
      sendProgress(sessionId, 2, 10, `กำลังดาวน์โหลดวิดีโอจาก YouTube (${youtubeQuality}p)...`);
      const downloadPath = path.join('uploads', `${namespace}_youtube.%(ext)s`);
      await downloadYouTubeVideo(youtubeVideoId, downloadPath, youtubeQuality);
      
      // หาไฟล์วิดีโอที่ดาวน์โหลดมา
      const videoFiles = fs.readdirSync('uploads').filter(f => f.startsWith(`${namespace}_youtube.`));
      if (videoFiles.length === 0) {
        throw new Error('ไม่สามารถดาวน์โหลดวิดีโอจาก YouTube ได้');
      }
      videoPath = path.join('uploads', videoFiles[0]);

      // ดาวน์โหลดเสียงจาก YouTube ถ้าเลือกใช้
      if (useYoutubeAudio) {
        sendProgress(sessionId, 2, 12, 'กำลังดาวน์โหลดเสียงจาก YouTube...');
        const audioDownloadPath = path.join('uploads', `${namespace}_audio.%(ext)s`);
        await downloadYouTubeAudio(youtubeVideoId, audioDownloadPath);
        
        // หาไฟล์เสียงที่ดาวน์โหลดมา
        const audioFiles = fs.readdirSync('uploads').filter(f => f.startsWith(`${namespace}_audio.`));
        if (audioFiles.length > 0) {
          audioPath = path.join('uploads', audioFiles[0]);
        }
      }
      
      // ดาวน์โหลดเสียงจาก YouTube Audio ID แยกต่างหาก
      if (youtubeAudioId) {
        sendProgress(sessionId, 2, 14, 'กำลังดาวน์โหลดเสียงจาก YouTube...');
        const audioDownloadPath = path.join('uploads', `${namespace}_separate_audio.%(ext)s`);
        await downloadYouTubeAudio(youtubeAudioId, audioDownloadPath);
        
        // หาไฟล์เสียงที่ดาวน์โหลดมา
        const audioFiles = fs.readdirSync('uploads').filter(f => f.startsWith(`${namespace}_separate_audio.`));
        if (audioFiles.length > 0) {
          audioPath = path.join('uploads', audioFiles[0]);
        }
      }
    } else if (req.files.video) {
      videoPath = req.files.video[0].path;
    } else {
      throw new Error('กรุณาอัปโหลดไฟล์วิดีโอหรือใส่ URL YouTube');
    }

    // ใช้เสียงจาก YouTube ถ้ามี หรือจากไฟล์อัปโหลด
    const finalAudioPath = audioPath || (req.files.audio ? req.files.audio[0].path : null);

    sendProgress(sessionId, 3, 15, 'กำลังแยกเฟรมจากวิดีโอ...');
    execSync(`ffmpeg -i ${escapePath(videoPath)} -vf fps=${fps} ${escapePath(path.join(frameDir, 'betmc_img_%d_frame.png'))}`);

    // ลบไฟล์วิดีโอ YouTube ที่ดาวน์โหลดมา
    if (youtubeVideoId && fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }

    const frames = fs.readdirSync(frameDir).filter(f => f.endsWith('.png'));
    sendProgress(sessionId, 4, 25, `พบ ${frames.length} เฟรม กำลังบีบอัดรูปภาพ...`);

    const totalFrames = frames.length;
    for (let i = 0; i < frames.length; i++) {
      const file = frames[i];
      const input = path.join(frameDir, file);
      const output = path.join(frameDir, `compressed_${file.replace('.png', '.jpg')}`);
      execSync(`magick ${escapePath(input)} -strip -quality ${quality} ${escapePath(output)}`);
      fs.unlinkSync(input);

      const progress = 25 + Math.floor((i + 1) / totalFrames * 25); // 25-50%
      const timeLeft = Math.ceil((totalFrames - i - 1) * 0.5); // ประมาณ 0.5 วินาทีต่อเฟรม
      sendProgress(sessionId, 4, progress, `บีบอัดเฟรม ${i + 1}/${totalFrames}`, timeLeft);
    }

    sendProgress(sessionId, 5, 50, 'จัดระเบียบไฟล์...');
    fs.readdirSync(frameDir).forEach(file => {
      if (file.startsWith('compressed_')) {
        fs.renameSync(
          path.join(frameDir, file),
          path.join(frameDir, file.replace('compressed_', ''))
        );
      }
    });

    // คัดลอกภาพ patch static จากเฟรมที่ 60 ถ้ามี
    const frame60 = path.join(frameDir, 'betmc_img_60_frame.jpg');
    const staticPatch = path.join(outputDir, 'subpacks/0/betmc_background/betmc_background_static_patch.jpg');
    fs.mkdirSync(path.dirname(staticPatch), { recursive: true });
    if (fs.existsSync(frame60)) {
      fs.copyFileSync(frame60, staticPatch);
    }

    sendProgress(sessionId, 6, 55, 'ดาวน์โหลด manifest.json...');
    // --- โหลด manifest.json จาก GitHub ---
    const manifestUrl = req.body.manifestUrl || 'https://raw.githubusercontent.com/HEENAO9k/Sounds/main/manifest.json';
    const manifestResponse = await fetch(manifestUrl);
    if (!manifestResponse.ok) throw new Error(`Failed to fetch manifest.json from ${manifestUrl}`);
    const manifestText = await manifestResponse.text();
    const manifest = JSON.parse(manifestText);

    manifest.header.name = textureName;
    manifest.header.uuid = crypto.randomUUID();
    manifest.modules[0].uuid = crypto.randomUUID();

    const manifestPath = path.join(outputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    sendProgress(sessionId, 7, 60, 'ดาวน์โหลดไฟล์เสียง...');
    // --- โหลด sounds.zip จาก GitHub และแตกไฟล์ ---
    const soundsZipUrl = req.body.soundsZipUrl || 'https://github.com/HEENAO9k/Sounds/raw/main/sounds.zip';
    const soundsResponse = await fetch(soundsZipUrl);
    if (!soundsResponse.ok) throw new Error(`Failed to fetch sounds.zip from ${soundsZipUrl}`);

    const soundsZipPath = path.join('uploads', `${namespace}_sounds.zip`);
    const soundsZipStream = fs.createWriteStream(soundsZipPath);
    await new Promise((resolve, reject) => {
      soundsResponse.body.pipe(soundsZipStream);
      soundsResponse.body.on('error', reject);
      soundsZipStream.on('finish', resolve);
    });

    sendProgress(sessionId, 8, 65, 'แตกไฟล์เสียง...');
    await fs.createReadStream(soundsZipPath)
      .pipe(unzipper.Extract({ path: path.join(outputDir, 'sounds') }))
      .promise();

    fs.unlinkSync(soundsZipPath);

    // แปลงไฟล์เสียงถ้ามี (จาก YouTube หรือไฟล์อัปโหลด)
    if (finalAudioPath) {
      sendProgress(sessionId, 9, 70, useYoutubeAudio ? 'แปลงไฟล์เสียงจาก YouTube...' : 'แปลงไฟล์เสียง...');
      const audioOutput = path.join(outputDir, 'sounds/music/menu');
      fs.mkdirSync(audioOutput, { recursive: true });
      execSync(`ffmpeg -i ${escapePath(finalAudioPath)} -vn -c:a libvorbis ${escapePath(path.join(audioOutput, 'menu1.ogg'))}`);
      for (let i = 2; i <= 4; i++) {
        fs.copyFileSync(path.join(audioOutput, 'menu1.ogg'), path.join(audioOutput, `menu${i}.ogg`));
      }

      // ลบไฟล์เสียง YouTube ที่ดาวน์โหลดมา
      if (audioPath && fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    }

    sendProgress(sessionId, 10, 75, 'คัดลอกไฟล์เพิ่มเติม...');
    // คัดลอกไอคอนถ้ามีอัปโหลด
    if (req.files.icon) {
      fs.copyFileSync(req.files.icon[0].path, path.join(outputDir, 'pack_icon.png'));
    }

    sendProgress(sessionId, 11, 80, 'สร้างไฟล์ config...');
    // สร้าง config betmc_config
    const config0 = {
      namespace: 'betmc_config',
      betmc_main_config: {
        $betmc_scr_backround_path: 'betmc_background/betmc_background_static_patch'
      }
    };
    const config1080 = {
      namespace: 'betmc_config',
      betmc_main_config: {
        $use_background_static_customs: false,
        $use_setting_background_static_customs: false,
        $use_background_animation: true,
        $betmc_frame_duration: 1 / fps
      }
    };
    fs.mkdirSync(path.join(outputDir, 'subpacks/0/betmc_config'), { recursive: true });
    fs.mkdirSync(path.join(outputDir, 'subpacks/1080/betmc_config'), { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'subpacks/0/betmc_config/config.json'), JSON.stringify(config0, null, 2));
    fs.writeFileSync(path.join(outputDir, 'subpacks/1080/betmc_config/config.json'), JSON.stringify(config1080, null, 2));

    sendProgress(sessionId, 12, 85, 'สร้างไฟล์ UI...');
    // สร้างไฟล์ UI
    const betmcCommonPath = path.join(outputDir, 'betmc_ui/betmc_common');
    const uiPath = path.join(outputDir, 'ui');
    fs.mkdirSync(betmcCommonPath, { recursive: true });
    fs.mkdirSync(uiPath, { recursive: true });

    let yBottom = 1500;
    const animFrames = [];
    while (animFrames.length < frames.length) {
      for (let y = 1500; y >= -1400 && animFrames.length < frames.length; y -= 100) {
        animFrames.push({ from: [`${y}%`, `${yBottom}%`] });
      }
      yBottom -= 100;
    }

    // ตรวจสอบว่ามี frames อย่างน้อย 1 เฟรม
    if (animFrames.length === 0) {
      throw new Error('ไม่พบเฟรมวิดีโอ กรุณาอัปโหลดไฟล์วิดีโอที่ถูกต้อง');
    }

    const animJson = { namespace };
    animJson[`${namespace}.app-js:8:19`] = {
      from: animFrames[0].from,
      to: animFrames[0].from,
      next: `@${namespace}.app-js:8:19-1`,
      anim_type: 'offset',
      duration: 1 / fps
    };
    animFrames.forEach((f, i) => {
      if (i === 0) return;
      const key = `${namespace}.app-js:8:19-${i}`;
      animJson[key] = {
        from: f.from,
        to: f.from,
        next: i + 1 < animFrames.length ? `@${namespace}.app-js:8:19-${i + 1}` : `@${namespace}.app-js:8:19`,
        anim_type: 'offset',
        duration: 1 / fps
      };
    });
    fs.writeFileSync(path.join(betmcCommonPath, `${namespace}.json`), JSON.stringify(animJson, null, 2));

    const bgCommon = {
      namespace: 'betmc_background',
      'betmc_animation_background_frame@betmc_common.empty_panel': {
        anims: [`@${namespace}.app-js:8:19`],
        controls: [],
        size: ['100%', '100%'],
        offset: `@${namespace}.app-js:8:19`,
        anchor_from: 'center',
        anchor_to: 'center'
      }
    };
    const controls = [];
    const defs = {};
    let x = -1500, y = -1500;
    for (let i = 0; i < frames.length; i++) {
      const key = i > 0 ? `app-js:31:30[${i}]` : 'app-js:31:30';
      const id = crypto.randomUUID().replace(/-/g, '');
      controls.push({ [`${id}@betmc_background.${key}`]: {} });
      defs[key] = {
        type: 'image',
        texture: `betmc_background/betmc_background_frame/betmc_img_${i + 1}_frame`,
        fill: true,
        size: ['100%', '100%'],
        offset: [`${x}%`, `${y}%`]
      };
      x += 100;
      if (x > 1400) {
        x = -1500;
        y += 100;
      }
      if (y > 1400) y = -1500;
    }
    bgCommon['betmc_animation_background_frame@betmc_common.empty_panel'].controls = controls;
    Object.assign(bgCommon, defs);
    fs.writeFileSync(path.join(betmcCommonPath, 'betmc_bg_common.json'), JSON.stringify(bgCommon, null, 2));

    const uiDefs = { ui_defs: [`betmc_ui/betmc_common/${namespace}.json`] };
    fs.writeFileSync(path.join(uiPath, '_ui_defs.json'), JSON.stringify(uiDefs, null, 2));

    sendProgress(sessionId, 13, 90, 'สร้างไฟล์ ZIP...');
    // สร้าง zip
    const zipPath = path.join('zips', `${namespace}.zip`);
    fs.mkdirSync('zips', { recursive: true });
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip');
    archive.pipe(output);
    archive.directory(outputDir, false);
    await archive.finalize();

    sendProgress(sessionId, 14, 100, 'เสร็จสิ้น!', 0);

    // ส่งอีเมลแจ้งเตือน (ถ้ามี)
    if (userEmail) {
      const downloadUrl = `${req.protocol}://${req.get('host')}/${zipPath}`;
      await sendNotificationEmail(userEmail, textureName, downloadUrl);
    }

    // ส่งผลลัพธ์สุดท้าย
    setTimeout(() => {
      const client = progressClients.get(sessionId);
      if (client) {
        client.write(`data: ${JSON.stringify({ completed: true, zip: `/${zipPath}` })}\n\n`);
        client.end();
        progressClients.delete(sessionId);
      }
    }, 1000);

  } catch (err) {
    console.error('Error:', err);
    sendProgress(sessionId, 0, 0, 'เกิดข้อผิดพลาด: ' + err.message);
    const client = progressClients.get(sessionId);
    if (client) {
      client.write(`data: ${JSON.stringify({ error: 'Error processing files' })}\n\n`);
      client.end();
      progressClients.delete(sessionId);
    }
  }
});

app.listen(3000, () => {
  console.log('Server listening at http://localhost:3000');
});