#!/bin/bash

echo "========================================"
echo "  BetMC Texture Generator Pro Enhanced"
echo "========================================"
echo ""

# สีสำหรับข้อความ
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}กำลังตรวจสอบ Node.js...${NC}"

# ตรวจสอบ Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ ไม่พบ Node.js กรุณาติดตั้ง Node.js ก่อน${NC}"
    echo -e "${BLUE}📥 ดาวน์โหลดได้ที่: https://nodejs.org/${NC}"
    exit 1
fi

echo -e "${GREEN}✅ พบ Node.js แล้ว${NC}"
node --version
echo ""

echo -e "${BLUE}กำลังตรวจสอบ dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 กำลังติดตั้ง dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ การติดตั้ง dependencies ล้มเหลว${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Dependencies พร้อมแล้ว${NC}"
fi

echo ""
echo -e "${BLUE}กำลังตรวจสอบ Python...${NC}"
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "${YELLOW}⚠️  ไม่พบ Python (ไม่บังคับ แต่แนะนำให้ติดตั้ง)${NC}"
    echo -e "${BLUE}📥 ดาวน์โหลดได้ที่: https://www.python.org/${NC}"
else
    echo -e "${GREEN}✅ พบ Python แล้ว${NC}"
    if command -v python3 &> /dev/null; then
        python3 --version
        echo -e "${BLUE}กำลังติดตั้ง Python dependencies...${NC}"
        python3 -m pip install -r requirements.txt > /dev/null 2>&1
    else
        python --version
        echo -e "${BLUE}กำลังติดตั้ง Python dependencies...${NC}"
        python -m pip install -r requirements.txt > /dev/null 2>&1
    fi
fi

echo ""
echo -e "${GREEN}🚀 เริ่มเซิร์ฟเวอร์...${NC}"
echo -e "${BLUE}🌐 URL: http://localhost:5000${NC}"
echo -e "${YELLOW}📱 กด Ctrl+C เพื่อหยุดเซิร์ฟเวอร์${NC}"
echo ""

# สร้างโฟลเดอร์ที่จำเป็น
mkdir -p temp uploads

# เริ่มเซิร์ฟเวอร์
node server.js