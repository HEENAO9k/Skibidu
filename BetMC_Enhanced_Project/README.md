# BetMC Texture Generator Pro - Enhanced Version

## 🚀 วิธีการติดตั้งและใช้งาน

### 📋 สิ่งที่ต้องติดตั้งก่อน

1. **Node.js** (จำเป็น)
   - ดาวน์โหลด: https://nodejs.org/
   - แนะนำเวอร์ชัน 16 หรือใหม่กว่า

2. **Python** (ไม่บังคับ แต่แนะนำ)
   - ดาวน์โหลด: https://www.python.org/
   - แนะนำเวอร์ชัน 3.8 หรือใหม่กว่า

### ⚡ วิธีเริ่มใช้งาน (แบบง่าย)

#### สำหรับ Windows:
```bash
# ดับเบิลคลิกไฟล์
start.bat
```

#### สำหรับ Linux/Mac:
```bash
# ในเทอร์มินัล
./start.sh
```

### 🔧 วิธีติดตั้งแบบ Manual

1. **ติดตั้ง Node.js dependencies:**
   ```bash
   npm install
   ```

2. **ติดตั้ง Python dependencies (ถ้ามี Python):**
   ```bash
   pip install -r requirements.txt
   ```

3. **เริ่มเซิร์ฟเวอร์:**
   ```bash
   node server.js
   ```

4. **เปิดเบราว์เซอร์:** http://localhost:5000

### ✨ ฟีเจอร์ใหม่ที่เพิ่มเข้ามา

#### 🔍 **Real-time Search System**
- ค้นหาฟังก์ชันและการตั้งค่าแบบทันที
- กรองผลลัพธ์ตามหมวดหมู่
- ไฮไลท์และนำทางไปยังองค์ประกอบ

#### 🌙 **Dark/Light Mode Toggle**  
- เปลี่ยนธีมระหว่างโหมดมืดและสว่าง
- จดจำการตั้งค่าผู้ใช้
- ปรับธีมอัตโนมัติตามระบบ

#### 🔔 **Notification System**
- การแจ้งเตือนแบบ Real-time
- แจ้งเตือนความคืบหน้าการประมวลผล
- แจ้งเตือนเมื่อมีข้อมูลใหม่

#### 🎨 **Enhanced UI/UX**
- ดีไซน์ Glassmorphism ที่ทันสมัย
- อนิเมชั่นที่นุ่มนวลและสวยงาม
- การตอบสนองที่ดีขึ้นสำหรับมือถือ

#### 📁 **Improved File Handling**
- ระบบ Drag & Drop ที่ปรับปรุงแล้ว
- ตรวจสอบประเภทและขนาดไฟล์
- พรีวิววิดีโอและรูปภาพ

### 🌐 การใช้งาน

1. **อัปโหลดวิดีโอ:** ลาก-วางไฟล์หรือคลิกเพื่อเลือก
2. **ตั้งค่า FPS และคุณภาพ:** ปรับตามต้องการ
3. **ใส่ชื่อ Texture Pack:** ตั้งชื่อที่ต้องการ
4. **กดสร้าง:** รอการประมวลผลเสร็จสิ้น
5. **ดาวน์โหลด:** ไฟล์ ZIP จะพร้อมดาวน์โหลด

### 🔧 การแก้ไขปัญหา

#### ปัญหา: ไม่พบ Node.js
```bash
# ตรวจสอบการติดตั้ง
node --version
npm --version
```

#### ปัญหา: Port 5000 ถูกใช้แล้ว
```bash
# เปลี่ยน port ในไฟล์ server.js
const PORT = 3000; // เปลี่ยนเป็นหมายเลขอื่น
```

#### ปัญหา: Dependencies ไม่ถูกต้อง
```bash
# ลบและติดตั้งใหม่
rm -rf node_modules package-lock.json
npm install
```

### 📱 Browser Support
- Chrome 80+ ✅
- Firefox 75+ ✅  
- Safari 13+ ✅
- Edge 80+ ✅

### 📊 System Requirements
- **RAM:** อย่างน้อย 2GB
- **CPU:** Dual-core หรือดีกว่า
- **Storage:** อย่างน้อย 1GB ว่าง
- **Network:** สำหรับดาวน์โหลด dependencies

### 📞 การช่วยเหลือ

หากพบปัญหา:
1. ตรวจสอบ Console ในเบราว์เซอร์ (F12)
2. ดู Log ในเทอร์มินัล
3. ตรวจสอบว่าติดตั้ง Node.js แล้ว
4. ลองเคลียร์ Cache เบราว์เซอร์

### 📄 ไฟล์สำคัญ

- `server.js` - เซิร์ฟเวอร์หลัก
- `public/index.html` - หน้าเว็บหลัก  
- `public/script.js` - JavaScript ฟีเจอร์ใหม่
- `public/styles.css` - CSS ที่ปรับปรุงแล้ว
- `package.json` - Dependencies
- `requirements.txt` - Python dependencies

---

## 🎯 เอกสารเพิ่มเติม

ดูเอกสารครบถ้วนได้ที่: `README_ENHANCEMENTS.md`

**🚀 Enhanced by AI Assistant - รักษาฟังก์ชันเดิมทั้งหมด ✅**
