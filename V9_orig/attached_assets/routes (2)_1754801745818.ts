import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { videoRequestSchema } from "@shared/schema";
import { z } from "zod";
import ytdl from "@distube/ytdl-core";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Video data interface for both TikTok and YouTube
interface VideoData {
  id: string;
  title: string;
  description: string;
  author: string;
  authorUsername: string;
  duration: number;
  views: number;
  likes: number;
  thumbnailUrl: string;
  videoUrl: string;
  audioUrl?: string;
  platform: "tiktok" | "youtube";
}

// Extract TikTok video data using Toby API
async function extractTikTokVideo(url: string): Promise<VideoData> {
  try {
    console.log(`Extracting TikTok video from: ${url}`);
    
    const Tiktok = await import("@tobyg74/tiktok-api-dl");
    let result;
    
    try {
      result = await Tiktok.default.Downloader(url, { version: "v2" });
    } catch (error) {
      console.log("v2 failed, trying v1:", (error as any).message);
      result = await Tiktok.default.Downloader(url, { version: "v1" });
    }

    if (!result || result.status !== "success") {
      throw new Error(`Failed to extract video data from TikTok: ${result?.message || 'Unknown error'}`);
    }

    const data = result.result as any;
    const videoId = data?.id || extractVideoId(url);
    
    const title = data?.desc || "TikTok Video";
    const description = data?.desc || "";
    const author = data?.author?.nickname || "Unknown User";
    const authorUsername = `@${data?.author?.nickname?.toLowerCase().replace(/\s+/g, '') || 'unknown'}`;
    const duration = data?.video?.duration || 0;
    const views = data?.statistics?.playCount || 0;
    const likes = data?.statistics?.diggCount || 0;
    const thumbnailUrl = data?.video?.cover || data?.author?.avatar || "";
    const videoUrl = data?.video?.playAddr?.[0] || "";
    const audioUrl = data?.music?.playUrl?.[0] || undefined;
    
    return {
      id: videoId,
      title,
      description,
      author,
      authorUsername,
      duration,
      views,
      likes,
      thumbnailUrl,
      videoUrl,
      audioUrl,
      platform: "tiktok",
    };
  } catch (error) {
    console.error("Error extracting TikTok video:", error);
    throw new Error("Failed to extract video data. The video might be private or unavailable.");
  }
}

// Extract YouTube video data using fallback methods
async function extractYouTubeVideo(url: string): Promise<VideoData> {
  console.log(`Extracting YouTube video from: ${url}`);
  
  // First try ytdl-core
  try {
    const info = await ytdl.getInfo(url);
    const videoDetails = info.videoDetails;
    
    // Get best quality video format
    const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
    const bestFormat = ytdl.chooseFormat(formats, { quality: 'highest' });
    
    // Get audio-only format
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    const audioFormat = ytdl.chooseFormat(audioFormats, { quality: 'highestaudio' });
    
    return {
      id: videoDetails.videoId,
      title: videoDetails.title || "YouTube Video",
      description: videoDetails.description || "",
      author: videoDetails.author.name || "Unknown Channel",
      authorUsername: `@${videoDetails.author.name?.toLowerCase().replace(/\s+/g, '') || 'unknown'}`,
      duration: parseInt(videoDetails.lengthSeconds) || 0,
      views: parseInt(videoDetails.viewCount) || 0,
      likes: 0,
      thumbnailUrl: videoDetails.thumbnails[0]?.url || "",
      videoUrl: bestFormat?.url || "",
      audioUrl: audioFormat?.url || undefined,
      platform: "youtube",
    };
  } catch (error) {
    console.log("ytdl-core failed, trying alternative method:", (error as any).message);
    
    // Fallback: Extract basic info and provide alternative download approach
    try {
      const videoId = ytdl.getVideoID(url);
      
      // Create a more basic response that relies on client-side or external service
      return {
        id: videoId,
        title: "YouTube Video (Click to view details)",
        description: "Video information will be loaded when you download. YouTube has bot protection that prevents direct metadata extraction.",
        author: "YouTube Channel",
        authorUsername: "@youtube",
        duration: 0,
        views: 0,
        likes: 0,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`, // Fallback URL
        audioUrl: undefined,
        platform: "youtube",
      };
    } catch (fallbackError) {
      console.error("All YouTube extraction methods failed:", fallbackError);
      
      // Last resort: try to extract video ID and provide basic info
      try {
        const videoId = ytdl.getVideoID(url);
        return {
          id: videoId,
          title: "YouTube Video (Bot Protection Active)",
          description: "YouTube is currently blocking metadata extraction. You can still access the video through the download link.",
          author: "YouTube Channel",
          authorUsername: "@youtube",
          duration: 0,
          views: 0,
          likes: 0,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          audioUrl: `https://www.youtube.com/watch?v=${videoId}`,
          platform: "youtube",
        };
      } catch (finalError) {
        throw new Error("Failed to extract YouTube video data. The video might be private, unavailable, or the URL is invalid.");
      }
    }
  }
}

function extractVideoId(url: string): string {
  // Extract video ID from various TikTok URL formats
  const patterns = [
    /\/video\/(\d+)/,
    /\/v\/(\d+)/,
    /vm\.tiktok\.com\/([A-Za-z0-9]+)/,
    /tiktok\.com\/t\/([A-Za-z0-9]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return url.split('/').pop() || 'unknown';
}

function detectPlatform(url: string): "tiktok" | "youtube" {
  const tiktokPatterns = [
    /^https?:\/\/(www\.)?tiktok\.com/,
    /^https?:\/\/vm\.tiktok\.com/,
    /^https?:\/\/vt\.tiktok\.com/,
    /^https?:\/\/m\.tiktok\.com/,
  ];

  const youtubePatterns = [
    /^https?:\/\/(www\.)?youtube\.com/,
    /^https?:\/\/youtu\.be/,
    /^https?:\/\/(www\.)?m\.youtube\.com/,
  ];

  if (tiktokPatterns.some(pattern => pattern.test(url))) {
    return "tiktok";
  }

  if (youtubePatterns.some(pattern => pattern.test(url))) {
    return "youtube";
  }

  // Default to tiktok for backward compatibility
  return "tiktok";
}

function isValidTikTokUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/,
    /^https?:\/\/vm\.tiktok\.com\/[\w]+/,
    /^https?:\/\/vt\.tiktok\.com\/[\w]+/,
    /^https?:\/\/m\.tiktok\.com\/v\/\d+/,
    /^https?:\/\/tiktok\.com\/t\/[\w]+/,
    /^https?:\/\/(www\.)?tiktok\.com\/.*\/video\/\d+/,
  ];
  
  return patterns.some(pattern => pattern.test(url));
}

function isValidYouTubeUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^https?:\/\/youtu\.be\/[\w-]+/,
    /^https?:\/\/(www\.)?m\.youtube\.com\/watch\?v=[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/v\/[\w-]+/,
  ];
  
  return patterns.some(pattern => pattern.test(url));
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Extract video data from TikTok or YouTube URL
  app.post("/api/extract", async (req, res) => {
    try {
      const { url } = videoRequestSchema.parse(req.body);
      const platform = detectPlatform(url);
      
      // Validate URL based on platform
      if (platform === "tiktok" && !isValidTikTokUrl(url)) {
        return res.status(400).json({ 
          message: "Invalid TikTok URL format. Please enter a valid TikTok video URL." 
        });
      }
      
      if (platform === "youtube" && !isValidYouTubeUrl(url)) {
        return res.status(400).json({ 
          message: "Invalid YouTube URL format. Please enter a valid YouTube video URL." 
        });
      }
      
      // Check if we already have this video
      const videoId = platform === "tiktok" ? extractVideoId(url) : ytdl.getVideoID(url);
      const existing = await storage.getDownloadByVideoId(videoId);
      
      if (existing && !existing.isProcessing) {
        return res.json(existing);
      }
      
      // Extract video data based on platform
      let videoData: VideoData;
      if (platform === "tiktok") {
        videoData = await extractTikTokVideo(url);
      } else {
        videoData = await extractYouTubeVideo(url);
      }
      
      // Save to storage
      const download = await storage.createDownload({
        originalUrl: url,
        videoId: videoData.id,
        platform: videoData.platform,
        title: videoData.title,
        description: videoData.description,
        author: videoData.author,
        authorUsername: videoData.authorUsername,
        duration: videoData.duration,
        views: videoData.views,
        likes: videoData.likes,
        thumbnailUrl: videoData.thumbnailUrl,
        videoUrl: videoData.videoUrl,
        audioUrl: videoData.audioUrl,
        downloadCount: 0,
        isProcessing: false,
      });
      
      res.json(download);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: error.errors[0]?.message || "Invalid request data" 
        });
      }
      
      console.error("Error extracting video:", error);
      res.status(500).json({ 
        message: "Failed to extract video data. Please check the URL and try again." 
      });
    }
  });
  
  // Download video
  app.post("/api/download/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const download = await storage.getDownload(id);
      
      if (!download) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      if (!download.videoUrl) {
        return res.status(400).json({ message: "Video URL not available" });
      }
      
      // Increment download count
      await storage.incrementDownloadCount(id);
      
      // Handle YouTube videos that may not have direct URLs due to bot protection
      if (download.platform === 'youtube' && (!download.videoUrl || download.videoUrl.includes('youtube.com'))) {
        return res.json({
          downloadUrl: `https://www.youtube.com/watch?v=${download.videoId}`,
          filename: `youtube_${download.videoId}.mp4`,
          message: "Due to YouTube's bot protection, please use the YouTube link to download manually or try a different video.",
          isRedirect: true
        });
      }
      
      // Return the direct download URL for working videos
      res.json({ 
        downloadUrl: download.videoUrl,
        filename: `${download.authorUsername?.replace('@', '') || 'video'}_${download.videoId}.mp4`
      });
    } catch (error) {
      console.error("Error downloading video:", error);
      res.status(500).json({ message: "Failed to process download" });
    }
  });
  
  // Download audio only
  app.post("/api/download-audio/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const download = await storage.getDownload(id);
      
      if (!download) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      if (!download.audioUrl) {
        return res.status(400).json({ message: "Audio not available for this video" });
      }
      
      await storage.incrementDownloadCount(id);
      
      // Handle YouTube audio that may not be available due to bot protection
      if (download.platform === 'youtube' && (!download.audioUrl || download.audioUrl.includes('youtube.com'))) {
        return res.json({
          downloadUrl: `https://www.youtube.com/watch?v=${download.videoId}`,
          filename: `youtube_${download.videoId}.mp3`,
          message: "Due to YouTube's bot protection, please use the YouTube link to download audio manually.",
          isRedirect: true
        });
      }
      
      res.json({ 
        downloadUrl: download.audioUrl,
        filename: `${download.authorUsername?.replace('@', '') || 'video'}_${download.videoId}.mp3`
      });
    } catch (error) {
      console.error("Error downloading audio:", error);
      res.status(500).json({ message: "Failed to process audio download" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
