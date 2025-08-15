# 📖 คู่มือติดตั้ง BetMC Texture Generator Pro Enhanced

## 🎯 คู่มือนี้เหมาะสำหรับใคร?
- ผู้ที่ไม่เคยใช้ Node.js มาก่อน
- ผู้ที่ต้องการคำแนะนำทีละขั้นตอน
- ผู้ที่ไม่สามารถใช้ Replit ได้

---

## 📋 ขั้นตอนที่ 1: ติดตั้งโปรแกรมที่จำเป็น

### 🟢 Node.js (จำเป็น)

#### Windows:
1. ไปที่ https://nodejs.org/
2. คลิก "Download for Windows" (ปุ่มสีเขียว)
3. ดาวน์โหลดไฟล์ `.msi` 
4. ดับเบิลคลิกไฟล์ที่ดาวน์โหลดมา
5. กด "Next" ตลอดจนจบ
6. รีสตาร์ทคอมพิวเตอร์

#### Mac:
1. ไปที่ https://nodejs.org/
2. คลิก "Download for macOS" 
3. ดาวน์โหลดไฟล์ `.pkg`
4. ดับเบิลคลิกและติดตั้ง
5. ใส่รหัสผ่าน Mac เมื่อถูกถาม

#### Linux (Ubuntu/Debian):
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 🟡 Python (ไม่บังคับ แต่แนะนำ)

#### Windows:
1. ไปที่ https://www.python.org/
2. คลิก "Download Python" (ปุ่มเหลือง)
3. **สำคัญ: เช็ค "Add Python to PATH"**
4. คลิก "Install Now"

#### Mac:
```bash
# ใช้ Homebrew (แนะนำ)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install python
```

#### Linux:
```bash
sudo apt update
sudo apt install python3 python3-pip
```

---

## 📋 ขั้นตอนที่ 2: ตรวจสอบการติดตั้ง

### เปิด Command Prompt/Terminal:

#### Windows:
- กด `Win + R`
- พิมพ์ `cmd`
- กด Enter

#### Mac:
- กด `Cmd + Space`
- พิมพ์ `Terminal`
- กด Enter

#### Linux:
- กด `Ctrl + Alt + T`

### ทดสอบคำสั่ง:
```bash
node --version
npm --version
python --version  # หรือ python3 --version
```

**ถ้าเห็นหมายเลขเวอร์ชัน = ติดตั้งสำเร็จ ✅**

---

## 📋 ขั้นตอนที่ 3: เตรียมโปรเจกต์

### 1. ดาวน์โหลดโปรเจกต์
- ดาวน์โหลด ZIP file
- แตกไฟล์ไปยังโฟลเดอร์ที่ต้องการ (เช่น Desktop)

### 2. เปิด Command Prompt/Terminal ในโฟลเดอร์โปรเจกต์

#### Windows:
- เปิด File Explorer
- ไปยังโฟลเดอร์โปรเจกต์
- คลิกขวาในพื้นที่ว่าง
- เลือก "Open in Terminal" หรือ "Git Bash Here"

#### Mac/Linux:
```bash
cd /path/to/BetMC_Enhanced_Project
```

---

## 📋 ขั้นตอนที่ 4: รันโปรแกรม

### วิธีง่าย (แนะนำ):

#### Windows:
```bash
# ดับเบิลคลิก
start.bat
```

#### Mac/Linux:
```bash
./start.sh
```

### วิธี Manual:
```bash
# ติดตั้ง dependencies
npm install

# เริ่มเซิร์ฟเวอร์
node server.js
```

---

## 📋 ขั้นตอนที่ 5: เปิดเว็บไซต์

1. เปิดเบราว์เซอร์ (Chrome, Firefox, Safari, Edge)
2. ไปที่: `http://localhost:5000`
3. หากเห็นหน้าเว็บ BetMC = สำเร็จ! 🎉

---

## ❌ แก้ไขปัญหาที่พบบ่อย

### ปัญหา 1: "node is not recognized"
**สาเหตุ:** Node.js ไม่ได้ติดตั้งหรือไม่อยู่ใน PATH

**วิธีแก้:**
1. ติดตั้ง Node.js ใหม่
2. รีสตาร์ทคอมพิวเตอร์
3. เปิด Command Prompt ใหม่

### ปัญหา 2: "Port 5000 is already in use"
**สาเหตุ:** มีโปรแกรมอื่นใช้ Port 5000

**วิธีแก้:**
1. ปิดโปรแกรมอื่นที่อาจใช้ Port 5000
2. หรือแก้ไขไฟล์ `server.js`:
   ```javascript
   const PORT = 3000; // เปลี่ยนจาก 5000 เป็น 3000
   ```

### ปัญหา 3: "npm install" ล้มเหลว
**สาเหตุ:** ปัญหาเครือข่ายหรือ permissions

**วิธีแก้:**
```bash
# ล้าง cache
npm cache clean --force

# ลบ node_modules และติดตั้งใหม่
rm -rf node_modules
rm package-lock.json
npm install
```

### ปัญหา 4: หน้าเว็บไม่โหลด
**วิธีแก้:**
1. ตรวจสอบว่าเซิร์ฟเวอร์ยังทำงานอยู่
2. ลองรีเฟรชหน้าเว็บ (F5)
3. ลองเปิด http://127.0.0.1:5000 แทน
4. ตรวจสอบ Firewall ว่าไม่ได้บล็อก

### ปัญหา 5: Python ไม่ทำงาน
**วิธีแก้:**
- ใน Windows: ลอง `python` แทน `python3`
- ใน Mac/Linux: ลอง `python3` แทน `python`
- ตรวจสอบว่าเช็ค "Add to PATH" ตอนติดตั้ง

---

## 🔧 คำสั่งที่มีประโยชน์

### ตรวจสอบสถานะ:
```bash
# ดู process ที่กำลังทำงาน
netstat -ano | findstr :5000    # Windows
lsof -i :5000                   # Mac/Linux

# หยุดเซิร์ฟเวอร์
Ctrl + C
```

### อัปเดต dependencies:
```bash
npm update
pip install -r requirements.txt --upgrade
```

### ล้างข้อมูล:
```bash
# ล้าง npm cache
npm cache clean --force

# ล้าง browser cache
Ctrl + Shift + Delete (ในเบราว์เซอร์)
```

---

## 📞 ยังไม่ได้? ลองสิ่งเหล่านี้

1. **รีสตาร์ทคอมพิวเตอร์** - แก้ปัญหา PATH ได้บ่อย
2. **ปิด Antivirus ชั่วคราว** - อาจบล็อกการติดตั้ง
3. **ใช้ Command Prompt แบบ Administrator** - สำหรับ Windows
4. **ตรวจสอบ Internet** - ต้องใช้ดาวน์โหลด dependencies
5. **ลองเบราว์เซอร์อื่น** - บางทีอาจเป็นปัญหา cache

---

## 🎯 เมื่อทุกอย่างทำงานแล้ว

คุณจะเห็น:
- ✅ หน้าเว็บ BetMC Texture Generator Pro
- ✅ ช่องค้นหาด้านบนขวา  
- ✅ ปุ่มเปลี่ยนธีม
- ✅ ระบบแจ้งเตือน
- ✅ การอัปโหลดแบบ Drag & Drop

**🎉 ยินดีด้วย! คุณติดตั้งสำเร็จแล้ว**

---

## 📱 ติดต่อขอความช่วยเหลือ

หากยังไม่สำเร็จ กรุณาเก็บข้อมูลนี้:
1. ระบบปฏิบัติการ (Windows/Mac/Linux)
2. เวอร์ชัน Node.js (`node --version`)
3. ข้อความ Error ที่เห็น
4. ขั้นตอนที่ทำมาแล้ว

**พร้อมใช้งาน BetMC Texture Generator Pro Enhanced แล้ว! 🚀**