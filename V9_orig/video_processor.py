
import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim
import os
import logging

class VideoProcessor:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
    def analyze_video_loop(self, video_path, start_time_sec=2, top_n=5):
        """
        วิเคราะห์วิดีโอเพื่อหาจุดที่เหมาะสมในการสร้างลูป
        """
        # ตรวจสอบไฟล์
        if not os.path.exists(video_path):
            raise Exception(f"❌ ไม่พบไฟล์วิดีโอที่: {video_path}")

        # โหลดวิดีโอ
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise Exception(f"❌ ไม่สามารถเปิดไฟล์วิดีโอได้: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        
        # อ่านเฟรมแรก
        ret, first_frame = cap.read()
        if not ret:
            raise Exception("❌ อ่านเฟรมแรกไม่ได้")
        
        first_gray = cv2.cvtColor(first_frame, cv2.COLOR_BGR2GRAY)
        
        # เริ่มจากเฟรมที่กำหนด
        start_frame_index = int(start_time_sec * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame_index)
        
        frame_index = start_frame_index
        scores = []
        
        self.logger.info("🔁 เริ่มตรวจความคล้าย...")
        
        # วนลูปทีละเฟรม
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame.shape[:2] != first_gray.shape:
                frame_index += 1
                continue

            frame_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            score = ssim(first_gray, frame_gray)
            scores.append((frame_index, score))

            # แสดงความคืบหน้าทุก 1 วินาที
            if frame_index % int(fps) == 0:
                self.logger.info(f"🔍 ตรวจเฟรมที่ {frame_index} ({round(frame_index/fps, 2)} วินาที)")

            frame_index += 1

        cap.release()

        # เรียง SSIM จากมากไปน้อย
        scores.sort(key=lambda x: x[1], reverse=True)

        # แสดง top N
        self.logger.info(f"📊 Top {top_n} เฟรมที่คล้ายเฟรมแรก (จาก {start_time_sec}s):")
        for rank, (idx, score) in enumerate(scores[:top_n], 1):
            time_sec = round(idx / fps, 2)
            self.logger.info(f"อันดับ {rank}: เฟรม {idx} ({time_sec} วินาที) → SSIM = {round(score, 5)}")

        return scores, fps

    def create_loop_video(self, video_path, output_path, best_frame_index, fps):
        """
        ตัดวิดีโอให้เป็นลูปที่สมบูรณ์
        """
        cap = cv2.VideoCapture(video_path)
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (w, h))

        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        for i in range(best_frame_index + 1):
            ret, frame = cap.read()
            if not ret:
                break
            out.write(frame)

        cap.release()
        out.release()

        self.logger.info(f"✂️ วิดีโอตัดสำเร็จ → saved: {output_path}")
        self.logger.info(f"🕒 ตัดตั้งแต่ 0.00s → {round(best_frame_index / fps, 2)}s")
        
        return output_path

    def detect_scene_changes(self, video_path):
        """
        ตรวจจับการเปลี่ยนฉากในวิดีโอ (ใช้ OpenCV แทน PySceneDetect เพื่อลดการใช้ library)
        """
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        # อ่านเฟรมแรก
        ret, prev_frame = cap.read()
        if not ret:
            return []
        
        prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
        scenes = [(0, 0)]  # (frame_index, timestamp)
        frame_index = 1
        threshold = 0.3  # ค่าเกณฑ์สำหรับการเปลี่ยนฉาก
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # คำนวณ structural similarity
            score = ssim(prev_gray, gray)
            
            # ถ้าความคล้ายคลึงต่ำกว่าเกณฑ์ = เปลี่ยนฉาก
            if score < threshold:
                timestamp = frame_index / fps
                scenes.append((frame_index, timestamp))
                self.logger.info(f"🎬 ตรวจพบฉากใหม่ที่เฟรม {frame_index} ({round(timestamp, 2)}s)")
            
            prev_gray = gray.copy()
            frame_index += 1
        
        cap.release()
        
        # เพิ่มฉากสุดท้าย
        scenes.append((frame_index - 1, (frame_index - 1) / fps))
        
        return scenes

    def process_video_for_texture(self, video_path, start_time_sec=2, top_n=5):
        """
        ประมวลผลวิดีโอเต็มรูปแบบสำหรับ texture pack
        """
        try:
            # 1. วิเคราะห์การลูป
            scores, fps = self.analyze_video_loop(video_path, start_time_sec, top_n)
            
            if not scores:
                self.logger.warning("⚠️ ไม่พบเฟรมที่เหมาะสมสำหรับการลูป")
                return video_path  # ใช้วิดีโอต้นฉบับ
            
            # 2. หาเฟรมที่ดีที่สุด
            best_frame_index = scores[0][0]
            best_score = scores[0][1]
            
            self.logger.info(f"🎯 เลือกเฟรมที่ดีที่สุด: {best_frame_index} (SSIM: {round(best_score, 5)})")
            
            # 3. ตัดวิดีโอให้เป็นลูป
            output_path = video_path.replace('.', '_processed.')
            processed_video = self.create_loop_video(video_path, output_path, best_frame_index, fps)
            
            # 4. ตรวจจับฉาก (ไว้สำหรับข้อมูลเพิ่มเติม)
            scenes = self.detect_scene_changes(processed_video)
            self.logger.info(f"📽️ ตรวจพบ {len(scenes)} ฉากในวิดีโอ")
            
            return processed_video
            
        except Exception as e:
            self.logger.error(f"❌ เกิดข้อผิดพลาดในการประมวลผลวิดีโอ: {str(e)}")
            return video_path  # ส่งคืนวิดีโอต้นฉบับหากมีปัญหา
