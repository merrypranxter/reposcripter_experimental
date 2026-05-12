/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />
import React, { Component, useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { 
  Github, 
  Sparkles, 
  Image as ImageIcon, 
  Video, 
  Download, 
  Camera,
  Settings, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Lock,
  Globe,
  Loader2,
  Volume2,
  History,
  Clock,
  User as UserIcon,
  LogOut,
  Trash2,
  GripVertical,
  GripHorizontal,
  Maximize2,
  Minimize2,
  X,
  Dna,
  Library,
  Copy,
  Plus,
  Search,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as THREE from 'three';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  limit,
  handleFirestoreError,
  OperationType,
  getDocFromServer,
  doc,
  deleteDoc
} from './firebase';
import type { User } from './firebase';

// --- Types ---
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface RepoContext {
  repoName: string;
  owner: string;
  description: string;
  language: string;
  topics: string;
  filePaths: string[];
  readme: string;
  fileContents: { path: string; content: string }[];
}

interface JS5Result {
  code: string;
  prompt: string;
  timestamp: number;
}

interface HistoryItem {
  id: string;
  prompt: string;
  repos: string[];
  js5Code: string;
  createdAt: any;
}

interface SavedPrompt {
  id: string;
  userId: string;
  title: string;
  text: string;
  createdAt: any;
}

interface AppState {
  ghToken: string;
  ghUser: string;
  repoSearch: string;
  selectedRepos: { name: string; owner: string }[];
  repos: any[];
  artPrompt: string;
  isGenerating: boolean;
  isLoadingRepos: boolean;
  status: string;
  js5Code: string;
  activePanel: 'github' | 'prompt' | 'history' | 'settings' | 'export' | 'library' | 'archive' | null;
  isRecording: boolean;
  recordingSeconds: number;
  isExportingToGH: boolean;
  exportRatio: string;
  isZenMode: boolean;
  entropy: number;
  isAudioReactive: boolean;
  spliceRatio: number;
  // Video export
  isExportingVideo: boolean;
  videoExportMinutes: number;
  exportVideoProgress: number;
  videoBitrate: 'standard' | 'high' | 'ultra';
  videoFps: 30 | 60;
  isSnapshotting: boolean;
  exportStatus: string;
  isReactorCollapsed: boolean;
  // Archive
  archiveFiles: { name: string; path: string; sha: string }[];
  isLoadingArchive: boolean;
}

// --- Constants ---
const EXPORT_RATIOS = [
  { label: '16:9 (Landscape)', value: '16:9', w: 1920, h: 1080 },
  { label: '9:16 (TikTok/Reels)', value: '9:16', w: 1080, h: 1920 },
  { label: '1:1 (Square)', value: '1:1', w: 1080, h: 1080 },
  { label: '4:3 (Classic)', value: '4:3', w: 1440, h: 1080 },
  { label: '3:4 (Portrait)', value: '3:4', w: 1080, h: 1440 },
  { label: '21:9 (Ultrawide)', value: '21:9', w: 2560, h: 1080 },
];

// --- Helpers ---
const GH_API = '/api/github';

function toBase64(str: string) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(base64: string) {
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function getRepos(username: string, token?: string) {
  const headers: any = {};
  if (token) headers['X-GitHub-Token'] = token;
  
  let allRepos: any[] = [];
  let page = 1;
  const perPage = 100;
  
  while (true) {
    const res = await fetch(`${GH_API}/users/${username}/repos?per_page=${perPage}&page=${page}&sort=updated`, { headers });
    if (!res.ok) throw new Error(`GitHub error ${res.status}: check username or token configuration`);
    
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    
    allRepos = [...allRepos, ...data];
    if (data.length < perPage) break;
    page++;
    
    // Safety limit: up to 10 pages (1000 repos) to avoid rate limits or performance issues
    if (page > 10) break;
  }
  
  return allRepos;
}

async function getFileContent(owner: string, repo: string, path: string, token?: string) {
  try {
    const headers: any = {};
    if (token) headers['X-GitHub-Token'] = token;
    const res = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${path}`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.content) {
      return fromBase64(data.content);
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function getRepoContext(owner: string, repo: string, token?: string): Promise<RepoContext> {
  const headers: any = {};
  if (token) headers['X-GitHub-Token'] = token;
  
  // 1. Fetch tree, metadata, and readme in parallel
  const [treeRes, metaRes, readmeRes] = await Promise.all([
    fetch(`${GH_API}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, { headers }),
    fetch(`${GH_API}/repos/${owner}/${repo}`, { headers }),
    fetch(`${GH_API}/repos/${owner}/${repo}/readme`, { headers }).catch(() => null)
  ]);

  if (!treeRes.ok) throw new Error(`Failed to fetch repo tree: ${treeRes.status}`);
  if (!metaRes.ok) throw new Error(`Failed to fetch repo metadata: ${metaRes.status}`);

  const [treeData, meta] = await Promise.all([
    treeRes.json(),
    metaRes.json()
  ]);

  const allFiles = (treeData.tree || [])
    .filter((f: any) => f.type === 'blob')
    .map((f: any) => f.path);

  // 2. Check for Manifest (Option 3)
  const manifestPath = allFiles.find((p: string) => 
    p.toLowerCase() === 'context.manifest.json' || 
    p.toLowerCase() === 'repo_context.md'
  );
  
  let manifestData: any = null;
  if (manifestPath) {
    const content = await getFileContent(owner, repo, manifestPath, token);
    if (content && manifestPath.endsWith('.json')) {
      try { manifestData = JSON.parse(content); } catch (_) {}
    }
  }

  // 3. Determine files to fetch (Option 3 or Fallback Option 2)
  let filesToFetch: string[] = [];
  if (manifestData?.files) {
    filesToFetch = manifestData.files;
  } else {
    const allowExtensions = ['.md', '.txt', '.json', '.yaml', '.yml', '.toml', '.js', '.ts', '.tsx', '.css', '.glsl', '.frag', '.vert'];
    const allowDirs = ['style/', 'prompts/', 'docs/', 'shaders/', 'src/'];
    const denyFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.map'];
    const denyDirs = ['node_modules/', 'dist/', 'build/', '.next/', 'coverage/', '.git/'];

    filesToFetch = allFiles.filter((p: string) => {
      const lp = p.toLowerCase();
      if (denyFiles.some(f => lp.endsWith(f))) return false;
      if (denyDirs.some(d => lp.includes(d))) return false;
      const inAllowDir = allowDirs.some(d => lp.startsWith(d));
      const hasAllowExt = allowExtensions.some(e => lp.endsWith(e));
      return inAllowDir || hasAllowExt;
    }).slice(0, 40); // Budget: Max 40 files
  }

  // 4. Fetch contents with concurrency limit
  const fileContents: { path: string; content: string }[] = [];
  const CHUNK_SIZE = 5;
  for (let i = 0; i < filesToFetch.length; i += CHUNK_SIZE) {
    const chunk = filesToFetch.slice(i, i + CHUNK_SIZE);
    const results = await Promise.all(
      chunk.map(async (path: string) => {
        const content = await getFileContent(owner, repo, path, token);
        return content ? { path, content: content.slice(0, 4000) } : null; // Budget: 4k chars per file
      })
    );
    results.forEach(r => { if (r) fileContents.push(r); });
  }

  let readme = '';
  if (readmeRes && readmeRes.ok) {
    try {
      const rData = await readmeRes.json();
      readme = fromBase64(rData.content).slice(0, 5000);
    } catch (_) {}
  }

  return {
    repoName: repo,
    owner,
    description: meta.description || '',
    language: meta.language || '',
    topics: (meta.topics || []).join(', '),
    filePaths: allFiles.slice(0, 100),
    readme,
    fileContents,
  };
}

// --- JS5 Engine ---
const JS5Canvas = ({ 
  code, 
  repoContexts, 
  userInput, 
  isRecording, 
  exportRatio,
  isExportingVideo,
  videoExportMinutes,
  videoBitrate,
  videoFps,
  isSnapshotting,
  onExportProgress,
  onExportStatus,
  onExportComplete,
  onSnapshotComplete,
  onStreamReady,
  audioData = { bass: 0, mid: 0, treble: 0 },
  entropy = 0,
  spliceRatio = 0.5,
  selectedReposCount = 0
}: { 
  code: string, 
  repoContexts: any[], 
  userInput: string, 
  isRecording: boolean, 
  exportRatio: string,
  isExportingVideo: boolean,
  videoExportMinutes: number,
  videoBitrate: string,
  videoFps: number,
  isSnapshotting: boolean,
  onExportProgress: (progress: number) => void,
  onExportStatus?: (status: string) => void,
  onExportComplete: () => void,
  onSnapshotComplete?: () => void,
  onStreamReady?: (stream: MediaStream) => void,
  audioData?: { bass: number, mid: number, treble: number },
  entropy?: number,
  spliceRatio?: number,
  selectedReposCount?: number
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recordingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  
  const onProgressRef = useRef(onExportProgress);
  const onStatusRef = useRef(onExportStatus);
  const onCompleteRef = useRef(onExportComplete);
  const onSnapshotRef = useRef(onSnapshotComplete);
  
  useEffect(() => { onProgressRef.current = onExportProgress; }, [onExportProgress]);
  useEffect(() => { onStatusRef.current = onExportStatus; }, [onExportStatus]);
  useEffect(() => { onCompleteRef.current = onExportComplete; }, [onExportComplete]);
  useEffect(() => { onSnapshotRef.current = onSnapshotComplete; }, [onSnapshotComplete]);

  // Use refs for parameters that might change during export but shouldn't restart the export
  const exportParamsRef = useRef({ videoExportMinutes, videoBitrate, videoFps, exportRatio });
  useEffect(() => {
    exportParamsRef.current = { videoExportMinutes, videoBitrate, videoFps, exportRatio };
  }, [videoExportMinutes, videoBitrate, videoFps, exportRatio]);

  const isThree = /THREE\.(WebGLRenderer|Scene|PerspectiveCamera|ShaderMaterial|RawShaderMaterial|Mesh|Group|Object3D|BufferGeometry|PlaneGeometry|BoxGeometry|SphereGeometry|Vector[23]|Color|Matrix[34]|Points|Line|Texture|RenderTarget|PointsMaterial|LineBasicMaterial)/.test(code);
  const contextType = isThree ? 'webgl2' : '2d';

  const mouseRef = useRef({ x: 0, y: 0, isPressed: false });

  // Include code hash in renderKey to force a clean re-mount on any code change.
  // This prevents stale Three.js state from polluting new generations.
  const codeHash = code.length + code.slice(0, 50) + code.slice(-50);
  // REMOVE isExportingVideo and callbacks from dependencies by not using them in renderKey or the main useEffect dependencies unless essential
  const renderKey = `${codeHash}-${isRecording}-${exportRatio}-${contextType}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId: number;
    let effectActive = true;
    let isCapturing = false;
    
    // Get context based on detected type. 
    const ctx = contextType === '2d' 
      ? canvas.getContext('2d') 
      : canvas.getContext('webgl2', { alpha: true, antialias: true, preserveDrawingBuffer: true });
    
    const recCanvas = recordingCanvasRef.current;
    const recCtx = recCanvas 
      ? (contextType === '2d' ? recCanvas.getContext('2d') : recCanvas.getContext('webgl2', { alpha: true, antialias: true, preserveDrawingBuffer: true }))
      : null;
    
    if (!ctx) {
      setError(`Could not get ${contextType} context.`);
      return;
    }

    const baseFontSize = 12;
    const baseCharWidth = baseFontSize * 0.6;
    const baseCharHeight = baseFontSize;

    // High-res recording settings
    const { videoExportMinutes: minutes, videoBitrate: bitrateKey, videoFps: fps, exportRatio: ratio } = exportParamsRef.current;
    const ratioConfig = EXPORT_RATIOS.find(r => r.value === ratio) || EXPORT_RATIOS[0];
    const recWidth = ratioConfig.w;
    const recHeight = ratioConfig.h;
    const recBaseFontSize = 18; 
    const recBaseCharWidth = recBaseFontSize * 0.6;
    const recBaseCharHeight = recBaseFontSize;

    if (recCanvas) {
      recCanvas.width = recWidth;
      recCanvas.height = recHeight;
    }

    const defaultCode = `
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, grid.width, grid.height);
      ctx.fillStyle = 'rgba(123, 47, 255, 0.3)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('REPOSCRIPTER SYSTEM IDLE', grid.width/2, grid.height/2 - 10);
      ctx.fillStyle = 'rgba(102, 102, 102, 0.3)';
      ctx.fillText('SELECT REPOS AND INVOKE THE WEIRD TO BEGIN', grid.width/2, grid.height/2 + 10);
      
      // Subtle scanning line
      const scanY = (time * 100) % grid.height;
      ctx.fillStyle = 'rgba(123, 47, 255, 0.05)';
      ctx.fillRect(0, scanY, grid.width, 1);
    `;

    let renderFn: any = null;
    try {
      const activeCode = code || defaultCode;
      const hasReturn = /\breturn\b/.test(activeCode);
      const isBlock = activeCode.includes(';') || activeCode.includes('\n') || /^\s*(const|let|var|function|if|for|while|switch|try|throw)/.test(activeCode);
      const finalCode = hasReturn ? activeCode : (isBlock ? activeCode : `return ${activeCode}`);

      renderFn = new Function('grid', 'time', 'repos', 'input', 'mouse', 'ctx', 'canvas', 'THREE', `
        try {
          ${finalCode}
        } catch (e) {
          throw e;
        }
      `);
      setError(null);
    } catch (e: any) {
      setError(e.message);
      return;
    }

    const render = (time: number) => {
      const cols = Math.floor(canvas.width / baseCharWidth);
      const rows = Math.floor(canvas.height / baseCharHeight);

      if (ctx && contextType === '2d') {
        const c2d = ctx as CanvasRenderingContext2D;
        c2d.fillStyle = '#050505';
        c2d.fillRect(0, 0, canvas.width, canvas.height);
        
        // Subtle "alive" grid
        c2d.strokeStyle = 'rgba(123, 47, 255, 0.05)';
        c2d.lineWidth = 1;
        c2d.beginPath();
        for(let x = 0; x < canvas.width; x += 50) {
          c2d.moveTo(x, 0); c2d.lineTo(x, canvas.height);
        }
        for(let y = 0; y < canvas.height; y += 50) {
          c2d.moveTo(0, y); c2d.lineTo(canvas.width, y);
        }
        c2d.stroke();

        c2d.textBaseline = 'top';
      }

      const mouse = {
        x: mouseRef.current.x,
        y: mouseRef.current.y,
        isPressed: mouseRef.current.isPressed
      };

      // Recording Render
      if (isRecording && recCtx && recCanvas) {
        const rCols = Math.floor(recWidth / recBaseCharWidth);
        const rRows = Math.floor(recHeight / recBaseCharHeight);
        
        if (contextType === '2d') {
          const r2d = recCtx as CanvasRenderingContext2D;
          r2d.fillStyle = '#050505';
          r2d.fillRect(0, 0, recWidth, recHeight);
          r2d.textBaseline = 'top';
        }

        try {
          const output = renderFn(
            { cols: rCols, rows: rRows, width: recWidth, height: recHeight, canvas: recCanvas }, 
            time / 1000, 
            repoContexts, 
            userInput, 
            mouse, 
            recCtx, 
            recCanvas,
            THREE
          );
          if (output && contextType === '2d') {
            renderASCII(recCtx as CanvasRenderingContext2D, output, recBaseCharWidth, recBaseCharHeight, recBaseFontSize);
          }
        } catch (e: any) {
          console.error("Recording Render Error:", e);
        }
      }

      try {
        const output = renderFn(
          { cols, rows, width: canvas.width, height: canvas.height, canvas }, 
          time / 1000, 
          repoContexts, 
          userInput, 
          mouse, 
          ctx, 
          canvas,
          THREE
        );
        if (output && contextType === '2d') {
          renderASCII(ctx as CanvasRenderingContext2D, output, baseCharWidth, baseCharHeight, baseFontSize);
        }
        if (error) setError(null);
      } catch (e: any) {
        console.error("Render Error:", e);
        if (e.message?.includes('precision')) {
          setError("WebGL Context Error: The browser could not create a WebGL context. Try refreshing or closing other tabs.");
        } else {
          setError(`Runtime Error: ${e.message}`);
        }
      }
    };

    const renderASCII = (context: CanvasRenderingContext2D, output: any, cW: number, cH: number, baseSize: number) => {
      context.textBaseline = 'top';
      if (typeof output === 'string') {
        const lines = output.split('\n');
        context.font = `${baseSize}px monospace`;
        lines.forEach((line, y) => {
          context.fillStyle = '#7b2fff';
          context.fillText(line, 0, y * cH);
        });
      } else if (Array.isArray(output)) {
        let currentFont = '';
        output.forEach((row, y) => {
          if (!Array.isArray(row)) return;
          
          let currentText = '';
          let startX = 0;
          let currentColor = '';
          let currentSize = 0;

          const flush = (x: number) => {
            if (currentText) {
              const font = `${currentSize || baseSize}px monospace`;
              if (currentFont !== font) {
                context.font = font;
                currentFont = font;
              }
              const color = currentColor || '#7b2fff';
              if (context.fillStyle !== color) context.fillStyle = color;
              context.fillText(currentText, startX * cW, y * cH);
              currentText = '';
            }
            startX = x;
          };

          row.forEach((char, x) => {
            if (typeof char === 'object' && char !== null) {
              const charColor = char.color || '#7b2fff';
              const charSize = char.size || baseSize;
              if (charColor !== currentColor || charSize !== currentSize) {
                flush(x);
                currentColor = charColor;
                currentSize = charSize;
              }
              currentText += char.char || ' ';
            } else if (typeof char === 'string') {
              if (currentColor !== '#7b2fff' || currentSize !== baseSize) {
                flush(x);
                currentColor = '#7b2fff';
                currentSize = baseSize;
              }
              currentText += char;
            } else {
              flush(x + 1);
            }
          });
          flush(row.length);
        });
      }
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseDown = () => { mouseRef.current.isPressed = true; };
    const handleMouseUp = () => { mouseRef.current.isPressed = false; };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    handleResize();
    
    if (isExportingVideo && recCanvas) {
      // Video Export Logic (WebCodecs + High Speed)
      isCapturing = true;
      const ratioConfig = EXPORT_RATIOS.find(r => r.value === exportRatio) || EXPORT_RATIOS[0];
      const width = ratioConfig.w;
      const height = ratioConfig.h;
      const fps = videoFps || 60;
      const bitrates = { standard: 8_000_000, high: 20_000_000, ultra: 50_000_000 };
      const bitrate = bitrates[videoBitrate as keyof typeof bitrates] || bitrates.high;

      const totalFrames = Math.floor(videoExportMinutes * 60 * fps);
      let currentFrame = 0;
      let lastStatusUpdate = Date.now();

      const statusMessages = [
        "Transmuting source history...",
        "Distilling syntax into light...",
        "Calculated emergence occurring...",
        "Coalescing geometric sprites...",
        "Hardening alchemical pixels...",
        "Finalizing the logic-buffer...",
      ];

      const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: { codec: 'avc', width, height },
        fastStart: 'in-memory'
      });

      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => {
          console.error("VideoEncoder Error:", e);
          onStatusRef.current?.("ENCODER ERROR: " + e.message);
          isCapturing = false;
          onCompleteRef.current?.();
        }
      });

      // Configure encoder
      const codecsToTry = ['avc1.4d002a', 'avc1.64002a', 'avc1.42E02a', 'avc1.42E01E'];
      let selectedCodec = '';
      
      (async () => {
        for (const codec of codecsToTry) {
          try {
            const support = await (VideoEncoder as any).isConfigSupported({
              codec, width, height, bitrate, framerate: fps
            });
            if (support.supported) {
              selectedCodec = codec;
              break;
            }
          } catch (_) { /* ignore */ }
        }

        if (!selectedCodec) {
          selectedCodec = codecsToTry[0];
        }

        try {
          encoder.configure({
            codec: selectedCodec,
            width, height,
            bitrate,
            framerate: fps,
            hardwareAcceleration: 'no-preference'
          });
          onStatusRef.current?.("ENGINE STABILIZED. BEGINNING RENDER...");
        } catch (e: any) {
          console.error("Encoder configuration failed:", e);
          onStatusRef.current?.("HARDWARE INITIALIZATION FAILED");
          isCapturing = false;
          onCompleteRef.current?.();
          return;
        }

        let lastReportedProgress = -1;
        const captureLoop = async () => {
          if (!effectActive || !isCapturing || !recCanvas || !recCtx) return;

          try {
            if (currentFrame >= totalFrames) {
              onStatusRef.current?.("SEALING ALCHEMICAL CONTAINER...");
              try {
                onStatusRef.current?.("DRAINING HARDWARE QUEUE...");
                let drainWait = 0;
                while (encoder.encodeQueueSize > 0 && drainWait < 2000) {
                  await new Promise(r => setTimeout(r, 30));
                  drainWait++;
                }
                
                const flushPromise = encoder.flush();
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error("GPU Flush Timeout")), 30000)
                );

                // If flush fails or times out, we do NOT finalize (prevents corrupted MP4s)
                await Promise.race([flushPromise, timeoutPromise]);

                muxer.finalize();
                
                const { buffer } = muxer.target as ArrayBufferTarget;
                if (!buffer || buffer.byteLength === 0) throw new Error("Generated buffer is empty");

                const blob = new Blob([buffer], { type: 'video/mp4' });
                const url = URL.createObjectURL(blob);
                
                onStatusRef.current?.("ALCHEMY COMPLETE. DISPATCHING...");
                
                const adHocName = userInput 
                  ? userInput.split(' ').slice(0, 3).join('_').replace(/[^a-z0-9]/gi, '_').toLowerCase() 
                  : 'alchemical_render';
                const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
                const fileName = `reposcripter_${adHocName}_${timestampStr}.mp4`;

                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                
                setTimeout(() => {
                  a.click();
                  setTimeout(() => {
                    if (document.body.contains(a)) document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    isCapturing = false;
                    onCompleteRef.current?.();
                  }, 1500);
                }, 200);

                if ((encoder as any).state !== 'closed') encoder.close();
              } catch (finalizeError: any) {
                console.error("Finalization Error:", finalizeError);
                onStatusRef.current?.("HALTED: " + finalizeError.message);
                isCapturing = false;
                onCompleteRef.current?.();
              }
              return;
            }

            // Processing burst: Render up to 2 frames if the hardware can keep up
            let processed = 0;
            const maxBurst = 2;
            
            while (isCapturing && currentFrame < totalFrames && processed < maxBurst && encoder.encodeQueueSize < 12) {
              const timeInSeconds = currentFrame / fps;

              if (contextType === '2d') {
                const r2d = recCtx as CanvasRenderingContext2D;
                r2d.fillStyle = '#050505';
                r2d.fillRect(0, 0, width, height);
              }

              const output = renderFn(
                { cols: Math.floor(width / recBaseCharWidth), rows: Math.floor(height / recBaseCharHeight), width, height, canvas: recCanvas }, 
                timeInSeconds, 
                repoContexts, 
                userInput, 
                { x: 0, y: 0, isPressed: false }, 
                recCtx, 
                recCanvas,
                THREE
              );

              if (output && contextType === '2d') {
                renderASCII(recCtx as CanvasRenderingContext2D, output, recBaseCharWidth, recBaseCharHeight, recBaseFontSize);
              }

              const frameDuration = 1_000_000 / fps;
              const timestamp = Math.floor(currentFrame * frameDuration);
              const frame = new VideoFrame(recCanvas, { 
                timestamp, 
                duration: Math.floor(frameDuration) 
              });

              encoder.encode(frame, { keyFrame: currentFrame % 120 === 0 });
              frame.close();

              currentFrame++;
              processed++;
            }

            // Updates
            const progress = Math.floor((currentFrame / totalFrames) * 100);
            if (progress !== lastReportedProgress) {
              onProgressRef.current(progress);
              lastReportedProgress = progress;
            }
            
            const now = Date.now();
            if (now - lastStatusUpdate > 2000) {
              const msgIdx = Math.min(statusMessages.length - 1, Math.floor((currentFrame / totalFrames) * statusMessages.length));
              onStatusRef.current?.(`${statusMessages[msgIdx]} (${currentFrame}/${totalFrames})`);
              lastStatusUpdate = now;
            }

            // Yield and reschedule
            if (isCapturing && currentFrame < totalFrames) {
              if (encoder.encodeQueueSize > 8) {
                // Throttle: wait for queue to drain slightly
                await new Promise(r => setTimeout(r, 10));
              }
              setTimeout(captureLoop, 0);
            }
          } catch (e: any) {
            console.error("Capture Loop Error:", e);
            onStatusRef.current?.("HALTED: EXCEPTION");
            isCapturing = false;
            onCompleteRef.current?.();
          }
        };

        captureLoop();
      })();
    } else if (isSnapshotting && recCanvas) {
      // Snapshot Logic (High-Res PNG)
      const ratioConfig = EXPORT_RATIOS.find(r => r.value === exportRatio) || EXPORT_RATIOS[0];
      const width = ratioConfig.w;
      const height = ratioConfig.h;

      try {
        if (contextType === '2d') {
          const r2d = recCtx as CanvasRenderingContext2D;
          r2d.fillStyle = '#050505';
          r2d.fillRect(0, 0, width, height);
        }

        const output = renderFn(
          { cols: Math.floor(width / recBaseCharWidth), rows: Math.floor(height / recBaseCharHeight), width, height, canvas: recCanvas }, 
          performance.now() / 1000, 
          repoContexts, 
          userInput, 
          { x: 0, y: 0, isPressed: false }, 
          recCtx, 
          recCanvas,
          THREE
        );

        if (output && contextType === '2d') {
          renderASCII(recCtx as CanvasRenderingContext2D, output, recBaseCharWidth, recBaseCharHeight, recBaseFontSize);
        }

        const dataUrl = recCanvas.toDataURL('image/png');
        const adHocName = userInput 
          ? userInput.split(' ').slice(0, 3).join('_').replace(/[^a-z0-9]/gi, '_').toLowerCase() 
          : 'alchemical_obsidian';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `reposcripter_${adHocName}_${timestamp}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        onSnapshotComplete?.();
      } catch (e) {
        console.error("Snapshot Error:", e);
        onSnapshotComplete?.();
      }
    } else {
      const renderLoop = (time: number) => {
        if (!effectActive) return;
        render(time);
        animationFrameId = requestAnimationFrame(renderLoop);
      };
      animationFrameId = requestAnimationFrame(renderLoop);

      if (isRecording && recCanvas && onStreamReady) {
        const stream = recCanvas.captureStream(60);
        onStreamReady(stream);
      }
    }

    return () => {
      effectActive = false;
      isCapturing = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      
      if ((canvas as any).__three) {
        const three = (canvas as any).__three;
        if (three.renderer) {
          try {
            three.renderer.dispose();
          } catch (e) {}
        }
        delete (canvas as any).__three;
      }

      if (recCanvas && (recCanvas as any).__three) {
        const three = (recCanvas as any).__three;
        if (three.renderer) {
          try {
            three.renderer.dispose();
          } catch (e) {}
        }
        delete (recCanvas as any).__three;
      }
    };
  }, [code, repoContexts, userInput, isRecording, exportRatio, contextType, isExportingVideo, isSnapshotting]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-auto overflow-hidden bg-bg">
      <canvas 
        key={`main-${renderKey}`}
        ref={canvasRef} 
        className="w-full h-full opacity-100 transition-opacity duration-1000" 
      />
      <canvas key={`rec-${renderKey}`} ref={recordingCanvasRef} className="hidden" />
      {error && (
        <div className="absolute bottom-4 left-20 bg-accent3/20 border border-accent3 text-accent3 p-4 text-[0.7rem] font-mono z-50 pointer-events-auto max-w-xl backdrop-blur-md flex justify-between items-start gap-4">
          <div>
            <div className="font-bold mb-1 flex items-center gap-2">
              <X className="w-3 h-3" /> JS5 RUNTIME ERROR
            </div>
            {error}
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-accent3 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-bg text-text p-6 text-center">
          <div className="text-accent3 text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold mb-2 uppercase tracking-widest">Something went wrong</h1>
          <p className="text-muted text-sm max-w-md mb-6">{this.state.error?.message || "An unexpected error occurred."}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-accent text-bg px-6 py-2 text-sm font-bold uppercase tracking-widest hover:bg-white transition-colors"
          >
            Reload Application
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

// --- Sub-components ---
const SidebarIcon = ({ icon: Icon, active, onClick, label }: any) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-lg transition-all duration-200 group relative ${active ? 'bg-accent text-bg shadow-[0_0_15px_rgba(123,47,255,0.5)]' : 'text-muted hover:text-accent'}`}
  >
    <Icon className="w-6 h-6" />
    <span className="absolute left-full ml-4 px-2 py-1 bg-panel border border-border text-[0.6rem] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100]">
      {label}
    </span>
  </button>
);

const GitHubPanel = ({ state, setState, handleLoadRepos, handleAddRepo, handleRemoveRepo }: any) => {
  const filteredRepos = state.repos.filter((r: any) => 
    r.name.toLowerCase().includes(state.repoSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-[0.6rem] uppercase tracking-widest text-muted flex justify-between">
          <span>GitHub Credentials</span>
          <span className="text-accent2/60 lowercase italic">Token optional if server-configured</span>
        </label>
        <input 
          type="password" 
          placeholder="Personal Access Token (Optional)" 
          className="bg-bg border-border focus:border-accent text-[0.7rem] p-2"
          value={state.ghToken}
          onChange={e => setState((s: any) => ({ ...s, ghToken: e.target.value }))}
        />
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Username" 
            className="flex-1 bg-bg border-border focus:border-accent text-[0.7rem] p-2"
            value={state.ghUser}
            onChange={e => setState((s: any) => ({ ...s, ghUser: e.target.value }))}
          />
          <button 
            onClick={handleLoadRepos}
            disabled={state.isLoadingRepos}
            className="bg-accent text-bg px-4 py-2 text-[0.65rem] font-bold uppercase hover:bg-white transition-colors disabled:opacity-50"
          >
            {state.isLoadingRepos ? <Loader2 className="animate-spin w-3 h-3" /> : 'Load'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[0.6rem] uppercase tracking-widest text-muted">The Mix ({state.selectedRepos.length})</label>
        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar pr-2 mb-2">
          {state.selectedRepos.length === 0 ? (
            <div className="text-[0.6rem] text-muted/40 italic py-2">No repos selected...</div>
          ) : (
            state.selectedRepos.map((repo: any, idx: number) => (
              <div key={`sel-${repo.name}-${idx}`} className="flex items-center justify-between bg-bg border border-border px-2 py-1 text-[0.65rem] group">
                <span className="truncate text-accent2">{repo.name}</span>
                <button onClick={() => handleRemoveRepo(idx)} className="text-muted hover:text-accent3">✕</button>
              </div>
            ))
          )}
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <Search className="h-3 w-3 text-muted/60" />
          </div>
          <input 
            type="text"
            placeholder="Filter repositories..."
            className="w-full bg-bg border-border focus:border-accent text-[0.7rem] pl-7 pr-2 py-1.5 transition-all text-text"
            value={state.repoSearch}
            onChange={e => setState((s: any) => ({ ...s, repoSearch: e.target.value }))}
            disabled={state.repos.length === 0}
          />
          {state.repoSearch && (
            <button 
              onClick={() => setState((s: any) => ({ ...s, repoSearch: '' }))}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-muted hover:text-accent font-bold text-[0.6rem]"
            >
              CLEAR
            </button>
          )}
        </div>

        <select 
          disabled={state.repos.length === 0}
          className="bg-bg border-border text-[0.7rem] p-2"
          value=""
          onChange={e => {
            handleAddRepo(e.target.value);
            setState((s: any) => ({ ...s, repoSearch: '' }));
          }}
        >
          <option value="">{state.repos.length > 0 ? (filteredRepos.length > 0 ? `+ Add from ${filteredRepos.length} matches` : 'No matches found') : '+ Add Repo'}</option>
          {filteredRepos.map((repo: any, idx: number) => (
            <option key={`repo-${repo.id || idx}-${idx}`} value={repo.name}>{repo.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

const PromptPanel = ({ state, setState, handleGenerate, handleSaveToLibrary, prompts }: any) => {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  
  const handleTextChange = (val: string) => {
    setState((s: any) => ({ ...s, artPrompt: val }));
    if (val.endsWith('/')) {
      setShowSlashMenu(true);
    } else if (!val.includes('/')) {
      setShowSlashMenu(false);
    }
  };

  const insertPrompt = (p: string) => {
    const newVal = state.artPrompt.replace(/\/$/, '') + p;
    setState((s: any) => ({ ...s, artPrompt: newVal }));
    setShowSlashMenu(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 relative">
        <label className="text-[0.6rem] uppercase tracking-widest text-muted flex justify-between">
          <span>Art Direction</span>
          <button 
            onClick={handleSaveToLibrary}
            className="text-accent hover:text-white transition-colors flex items-center gap-1 lowercase italic"
            disabled={!state.artPrompt}
          >
            <Plus className="w-2.5 h-2.5" /> Save to Library
          </button>
        </label>
        <textarea 
          rows={6}
          placeholder="Describe the visual logic... (Type / for library)"
          className="bg-bg border-border focus:border-accent text-[0.75rem] p-3 resize-none"
          value={state.artPrompt}
          onChange={e => handleTextChange(e.target.value)}
        />
        
        <AnimatePresence>
          {showSlashMenu && prompts.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-panel border border-border shadow-2xl z-[110] max-h-48 overflow-y-auto custom-scrollbar rounded-md p-1"
            >
              <div className="px-2 py-1 text-[0.5rem] uppercase tracking-widest text-muted border-b border-border/30 mb-1">Select from Library</div>
              {prompts.map((p: any, idx: number) => (
                <button 
                  key={`menu-p-${p.id || idx}-${idx}`}
                  onClick={() => insertPrompt(p.text)}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 text-[0.7rem] transition-colors rounded-sm flex flex-col gap-0.5 group"
                >
                  <span className="font-bold text-accent2 group-hover:text-accent truncate">{p.title}</span>
                  <span className="text-muted line-clamp-1 text-[0.6rem] italic">"{p.text}"</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[0.55rem] text-muted/60 italic">
          Tip: You can now ask for interactivity (mouse movement, clicks) and varied font sizes! Type <span className="text-accent2">/</span> to access saved commands.
        </p>
      </div>

    <button 
      onClick={handleGenerate}
      disabled={state.isGenerating || state.selectedRepos.length === 0}
      className="bg-accent text-bg py-4 text-[0.8rem] font-bold uppercase tracking-[0.2em] hover:bg-white transition-colors disabled:opacity-30 shadow-[0_0_20px_rgba(123,47,255,0.3)]"
    >
      {state.isGenerating ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Invoke the Weird'}
    </button>

    {state.js5Code && (
      <div className="flex flex-col gap-2">
        <label className="text-[0.6rem] uppercase tracking-widest text-muted">Active Script</label>
        <div className="bg-bg border border-border p-3 rounded-sm">
          <div className="text-[0.6rem] font-mono text-muted truncate">{state.js5Code.slice(0, 100)}...</div>
        </div>
      </div>
    )}
  </div>
  );
};

const HistoryPanel = ({ history, user, handleLogin, setState, setRepoContexts, handleDownloadFormula, handleClearHistory }: any) => (
  <div className="flex flex-col gap-4">
    {!user ? (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-4 opacity-50">
        <Lock className="w-10 h-10" />
        <p className="text-[0.65rem] uppercase tracking-widest">Sign in to view history</p>
        <button onClick={handleLogin} className="bg-accent text-bg px-4 py-2 text-[0.7rem] font-bold uppercase">Sign In</button>
      </div>
    ) : history.length === 0 ? (
      <div className="text-center py-10 text-muted text-[0.65rem] uppercase tracking-widest opacity-30">No history found</div>
    ) : (
      <>
        <div className="flex flex-col gap-3">
          {history.map((item: any, idx: number) => (
            <div key={`hist-${item.id || idx}-${idx}`} className="bg-bg border border-border p-3 hover:border-accent transition-colors cursor-pointer group"
              onClick={() => {
                setState((s: any) => ({ ...s, js5Code: item.js5Code, artPrompt: item.prompt }));
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[0.6rem] text-accent2 mb-1">{item.createdAt?.toDate().toLocaleDateString()}</div>
                  <div className="text-[0.7rem] font-medium line-clamp-2 mb-2 italic">"{item.prompt}"</div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDownloadFormula(item); }}
                  className="opacity-0 group-hover:opacity-100 p-2 text-muted hover:text-accent transition-all"
                  title="Download Alchemical Formula"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {item.repos.map((r: string, rIdx: number) => (
                  <span key={`hist-r-${r}-${rIdx}`} className="text-[0.5rem] bg-panel2 px-1.5 py-0.5 text-muted uppercase">{r}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button 
          onClick={handleClearHistory}
          className="mt-4 text-[0.6rem] uppercase tracking-[0.2em] text-accent3/50 hover:text-accent3 transition-colors py-4 border-t border-border/50"
        >
          Obliterate History
        </button>
      </>
    )}
  </div>
);

const ArchivePanel = ({ state, setState, handleLoadArchive, handleLoadArchiveFile }: any) => {
  return (
    <div className="flex flex-col gap-4">
      {!state.ghToken ? (
        <div className="text-center py-10 text-muted text-[0.65rem] uppercase tracking-widest opacity-30"> GitHub Token Required </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[0.6rem] uppercase tracking-widest text-muted">Archive Repository Owner</label>
            <input 
              type="text"
              value={state.ghUser}
              placeholder="e.g. merrypranxter"
              onChange={e => setState((s: any) => ({ ...s, ghUser: e.target.value }))}
              className="bg-bg border border-border px-3 py-2 text-[0.7rem] font-mono text-accent2 focus:border-accent outline-none transition-all placeholder:opacity-30"
            />
            <div className="text-[0.5rem] text-muted-foreground/50 leading-relaxed">
              Default is your username. Enter a custom owner if the archive lives elsewhere.
            </div>
          </div>

          <button 
            onClick={handleLoadArchive}
            disabled={state.isLoadingArchive}
            className="bg-accent2 text-bg py-2 text-[0.7rem] font-bold uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50"
          >
            {state.isLoadingArchive ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Synchronize Archive'}
          </button>

          {state.archiveFiles.length === 0 ? (
            <div className="text-center py-10 text-muted text-[0.65rem] uppercase tracking-widest opacity-30 flex flex-col gap-3">
              <span>{state.isLoadingArchive ? 'Synchronizing...' : 'No relevant files found'}</span>
              <div className="flex flex-col gap-1 text-[0.5rem] normal-case text-muted/40">
                <span>Looking in: {state.ghUser || 'merrypranxter'}/repo_script_js5_code</span>
                <span>Searching for: .js, .js5, .txt, .glsl</span>
                {state.status.includes('failed') && <span className="text-accent3/50">{state.status}</span>}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
               <label className="text-[0.6rem] uppercase tracking-widest text-muted">Stored Alchemies ({state.archiveFiles.length})</label>
               <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                {state.archiveFiles.map((file: any, idx: number) => (
                  <button 
                    key={`archive-${file.path}-${idx}`}
                    onClick={() => handleLoadArchiveFile(file.path)}
                    className="w-full text-left bg-bg border border-border p-3 hover:border-accent transition-all group flex flex-col gap-1"
                  >
                    <div className="text-[0.7rem] font-mono text-accent2 group-hover:text-accent truncate">{file.name}</div>
                    <div className="text-[0.5rem] text-muted flex items-center gap-2">
                      <span className="uppercase tracking-widest">Path: {file.path}</span>
                      <span className="opacity-30">|</span>
                      <span>SHA: {file.sha.slice(0, 7)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const PromptLibraryPanel = ({ prompts, setState, handleDeletePrompt }: any) => (
  <div className="flex flex-col gap-4">
    {prompts.length === 0 ? (
      <div className="text-center py-10 text-muted text-[0.65rem] uppercase tracking-widest opacity-30">Library Empty</div>
    ) : (
      <div className="flex flex-col gap-3">
        {prompts.map((p: any, idx: number) => (
          <div key={`lib-p-${p.id || idx}-${idx}`} className="bg-bg border border-border p-3 hover:border-accent transition-colors cursor-pointer group"
            onClick={() => {
              setState((s: any) => ({ ...s, artPrompt: p.text, activePanel: 'prompt' }));
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-[0.7rem] font-bold text-accent2 mb-1 uppercase tracking-wider">{p.title || 'Untitled Prompt'}</div>
                <div className="text-[0.7rem] leading-relaxed line-clamp-3 italic text-muted">"{p.text}"</div>
              </div>
              <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    navigator.clipboard.writeText(p.text);
                  }}
                  className="p-1.5 text-muted hover:text-accent transition-all"
                  title="Copy to Clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeletePrompt(p.id); }}
                  className="p-1.5 text-muted hover:text-accent3 transition-all"
                  title="Delete from Library"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const SettingsPanel = ({ state, setState, user, handleLogout, handleLogin }: any) => (
  <div className="flex flex-col gap-6">
    <div className="flex flex-col gap-2">
      <label className="text-[0.6rem] uppercase tracking-widest text-muted">Account</label>
      {user ? (
        <div className="flex items-center gap-3 bg-bg border border-border p-3">
          <img src={user.photoURL} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
          <div className="flex-1 min-w-0">
            <div className="text-[0.7rem] font-bold truncate">{user.displayName}</div>
            <div className="text-[0.6rem] text-muted truncate">{user.email}</div>
          </div>
          <button onClick={handleLogout} className="text-accent3 hover:text-white"><LogOut className="w-4 h-4" /></button>
        </div>
      ) : (
        <button onClick={handleLogin} className="bg-accent text-bg py-2 text-[0.7rem] font-bold uppercase">Sign In with Google</button>
      )}
    </div>

    <div className="flex flex-col gap-2">
      <label className="text-[0.6rem] uppercase tracking-widest text-muted">System</label>
      <div className="text-[0.6rem] text-muted leading-relaxed">
        RepoScripter (Prismatic Singularity Edition) v7.7.7<br />
        Engine: Alchemical Hybrid (Weird + Nature + Prismatic Corpus)<br />
        Knowledge: Min + Moire + Fractal + Shine <span className="text-accent2">INJECTED</span><br />
        Sandbox: Feral Generative Canvas
      </div>
    </div>
  </div>
);

const ExportPanel = ({ state, setState, handleStartRecording, handleStopRecording, handleGitHubExport, handleStartVideoExport, handleTakeSnapshot }: any) => (
  <div className="flex flex-col gap-6">
    <div className="flex flex-col gap-4">
      <label className="text-[0.6rem] uppercase tracking-widest text-muted">High-Res Capture (WEBCodecs MP4)</label>
      <div className="bg-bg border border-border p-4 flex flex-col gap-4">
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[0.55rem] uppercase tracking-widest text-muted/60">Bitrate</label>
            <div className="flex gap-1">
              {['standard', 'high', 'ultra'].map((b) => (
                <button
                  key={b}
                  onClick={() => setState((s: any) => ({ ...s, videoBitrate: b }))}
                  className={`flex-1 text-[0.5rem] py-1 border transition-all ${
                    state.videoBitrate === b ? 'bg-accent2 text-bg border-accent2' : 'border-border text-muted hover:border-accent2'
                  }`}
                >
                  {b.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[0.55rem] uppercase tracking-widest text-muted/60">Framerate</label>
            <div className="flex gap-1">
              {[30, 60].map((f) => (
                <button
                  key={f}
                  onClick={() => setState((s: any) => ({ ...s, videoFps: f }))}
                  className={`flex-1 text-[0.5rem] py-1 border transition-all ${
                    state.videoFps === f ? 'bg-accent2 text-bg border-accent2' : 'border-border text-muted hover:border-accent2'
                  }`}
                >
                  {f} FPS
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[0.55rem] uppercase tracking-widest text-muted/60">
            <span>Video Duration</span>
            <span className="text-accent2 font-mono">{state.videoExportMinutes}m ({(state.videoExportMinutes * 60).toFixed(0)}s)</span>
          </div>
          <input 
            type="range" 
            min="0.1" 
            max="10" 
            step="0.1" 
            value={state.videoExportMinutes}
            onChange={e => setState((s: any) => ({ ...s, videoExportMinutes: parseFloat(e.target.value) }))}
            disabled={state.isExportingVideo}
            className="w-full h-[2px] bg-border/50 rounded-lg appearance-none cursor-pointer accent-accent2"
          />
        </div>

        {state.isExportingVideo ? (
          <div className="space-y-2">
            <div className="flex justify-between text-[0.6rem] font-mono text-accent2">
              <span className="animate-pulse">{state.exportStatus || 'ENCODING...'}</span>
              <span>{state.exportVideoProgress}%</span>
            </div>
            <div className="h-1 bg-border/20 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-accent2 shadow-[0_0_10px_rgba(0,229,255,0.5)]" 
                initial={{ width: 0 }}
                animate={{ width: `${state.exportVideoProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={handleTakeSnapshot}
              disabled={!state.js5Code || state.isSnapshotting}
              className="flex-1 bg-bg border border-accent text-accent py-2 text-[0.65rem] font-bold uppercase hover:bg-accent hover:text-bg transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-3.5 h-3.5" /> Snapshot
            </button>
            <button 
              onClick={handleStartVideoExport}
              disabled={!state.js5Code}
              className="flex-[2] bg-bg border border-accent2 text-accent2 py-2 text-[0.65rem] font-bold uppercase hover:bg-accent2 hover:text-bg transition-all flex items-center justify-center gap-2"
            >
              <Video className="w-3.5 h-3.5" /> Render Video
            </button>
          </div>
        )}
      </div>
    </div>

    <div className="flex flex-col gap-4">
      <label className="text-[0.6rem] uppercase tracking-widest text-muted">Stream Recording</label>
      <div className="bg-bg border border-border p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[0.55rem] uppercase tracking-widest text-muted/60">Canvas Size / Aspect Ratio</label>
          <div className="grid grid-cols-2 gap-2">
            {EXPORT_RATIOS.map(ratio => (
              <button
                key={ratio.value}
                onClick={() => setState((s: any) => ({ ...s, exportRatio: ratio.value }))}
                disabled={state.isRecording || state.isExportingVideo}
                className={`text-[0.6rem] py-2 border transition-all ${
                  state.exportRatio === ratio.value 
                    ? 'bg-accent text-bg border-accent font-bold' 
                    : 'bg-bg border-border text-muted hover:border-accent/50'
                } ${(state.isRecording || state.isExportingVideo) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {ratio.label}
              </button>
            ))}
          </div>
        </div>
        
        {state.isRecording ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent3 rounded-full animate-pulse" />
                <span className="text-[0.7rem] font-mono text-accent3">RECORDING: {state.recordingSeconds}s</span>
              </div>
              <button 
                onClick={handleStopRecording}
                className="bg-accent3 text-white px-4 py-1.5 text-[0.7rem] font-bold uppercase tracking-widest hover:bg-opacity-80 transition-all"
              >
                Stop & Save
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setState((s: any) => ({ ...s, isRecording: true }))}
            disabled={!state.js5Code || state.isExportingVideo}
            className="bg-accent text-bg px-4 py-2 text-[0.7rem] font-bold uppercase tracking-widest hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Video className="w-4 h-4" />
            Start {state.exportRatio} Capture
          </button>
        )}
      </div>
    </div>

    <div className="flex flex-col gap-4">
      <label className="text-[0.6rem] uppercase tracking-widest text-muted">GitHub Export</label>
      <div className="bg-bg border border-border p-4 flex flex-col gap-4">
        <p className="text-[0.65rem] text-muted">
          Push the generated JS5 code to your dedicated art repository:
          <br/>
          <span className="text-accent2">{state.ghUser || 'your-username'}/repo_script_js5_code</span>
        </p>
        
        <button 
          onClick={handleGitHubExport}
          disabled={!state.js5Code || state.isExportingToGH || !state.ghToken}
          className="bg-accent2 text-bg px-4 py-2 text-[0.7rem] font-bold uppercase tracking-widest hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {state.isExportingToGH ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Pushing to Hub...
            </>
          ) : (
            <>
              <Github className="w-4 h-4" />
              Export to GitHub
            </>
          )}
        </button>
      </div>
    </div>
  </div>
);

const AuthModal = ({ isOpen, onClose, user, handleLogin, handleLogout, state, setState, handleLoadRepos }: any) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-bg/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-panel border border-border w-full max-w-md p-8 shadow-2xl rounded-lg"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold tracking-[0.2em] text-accent2 uppercase">Identity</h2>
            <button onClick={onClose} className="text-muted hover:text-accent3"><X className="w-6 h-6" /></button>
          </div>

          <div className="flex flex-col gap-8">
            {user ? (
              <div className="flex items-center gap-4 bg-bg border border-border p-4">
                <img src={user.photoURL} className="w-12 h-12 rounded-full" referrerPolicy="no-referrer" />
                <div className="flex-1">
                  <div className="text-sm font-bold">{user.displayName}</div>
                  <div className="text-xs text-muted">{user.email}</div>
                </div>
                <button onClick={handleLogout} className="bg-accent3/10 text-accent3 px-4 py-2 text-xs font-bold uppercase hover:bg-accent3 hover:text-bg transition-colors">Sign Out</button>
              </div>
            ) : (
              <button onClick={handleLogin} className="bg-accent text-bg py-4 text-sm font-bold uppercase tracking-widest hover:bg-white transition-colors">Sign In with Google</button>
            )}

            <div className="flex flex-col gap-4">
              <h3 className="text-[0.6rem] uppercase tracking-[0.3em] text-muted border-b border-border pb-2">GitHub Integration</h3>
              <div className="flex flex-col gap-3">
                <input 
                  type="password" 
                  placeholder="Personal Access Token" 
                  className="bg-bg border-border focus:border-accent text-sm p-3"
                  value={state.ghToken}
                  onChange={e => setState((s: any) => ({ ...s, ghToken: e.target.value }))}
                />
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Username" 
                    className="flex-1 bg-bg border-border focus:border-accent text-sm p-3"
                    value={state.ghUser}
                    onChange={e => setState((s: any) => ({ ...s, ghUser: e.target.value }))}
                  />
                  <button 
                    onClick={() => { handleLoadRepos(); onClose(); }}
                    className="bg-accent2 text-bg px-6 py-2 text-xs font-bold uppercase hover:bg-white transition-colors"
                  >
                    Load
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

function AppContent() {
  const [state, setState] = useState<AppState>({
    ghToken: '',
    ghUser: '',
    repoSearch: '',
    selectedRepos: [],
    repos: [],
    artPrompt: '',
    isGenerating: false,
    isLoadingRepos: false,
    status: '',
    js5Code: '',
    activePanel: null,
    isRecording: false,
    recordingSeconds: 0,
    isExportingToGH: false,
    exportRatio: '16:9',
    isZenMode: false,
    entropy: 0,
    isAudioReactive: false,
    spliceRatio: 0.5,
    isExportingVideo: false,
    videoExportMinutes: 0.5,
    exportVideoProgress: 0,
    videoBitrate: 'high',
    videoFps: 60,
    isSnapshotting: false,
    exportStatus: '',
    isReactorCollapsed: false,
    archiveFiles: [],
    isLoadingArchive: false,
  });

  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [repoContexts, setRepoContexts] = useState<any[]>([]);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [audioData, setAudioData] = useState({ bass: 0, mid: 0, treble: 0 });
  const audioRef = useRef<{ context: AudioContext, analyzer: AnalyserNode, stream: MediaStream } | null>(null);

  useEffect(() => {
    if (state.isAudioReactive) {
      let animationFrameId: number;
      const startAudio = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const context = new (window.AudioContext || (window as any).webkitAudioContext)();
          const analyzer = context.createAnalyser();
          const source = context.createMediaStreamSource(stream);
          source.connect(analyzer);
          analyzer.fftSize = 256;
          audioRef.current = { context, analyzer, stream };
          
          const bufferLength = analyzer.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          
          const update = () => {
            if (!audioRef.current) return;
            analyzer.getByteFrequencyData(dataArray);
            
            // Basic frequency bin grouping (normalized 0-1)
            const bass = Array.from(dataArray.slice(0, 10)).reduce((a, b) => a + b, 0) / (10 * 255);
            const mid = Array.from(dataArray.slice(10, 50)).reduce((a, b) => a + b, 0) / (40 * 255);
            const treble = Array.from(dataArray.slice(50, 100)).reduce((a, b) => a + b, 0) / (50 * 255);
            
            setAudioData({ bass: bass || 0, mid: mid || 0, treble: treble || 0 });
            animationFrameId = requestAnimationFrame(update);
          };
          update();
        } catch (e) {
          console.error("Audio access denied or failed", e);
          setState(s => ({ ...s, isAudioReactive: false }));
        }
      };
      startAudio();
      return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      };
    } else {
      if (audioRef.current) {
        audioRef.current.stream.getTracks().forEach(t => t.stop());
        if (audioRef.current.context.state !== 'closed') {
          audioRef.current.context.close();
        }
        audioRef.current = null;
      }
      setAudioData({ bass: 0, mid: 0, treble: 0 });
    }
  }, [state.isAudioReactive]);

  useEffect(() => {
    // Local mock connection test
    async function testConnection() {
      try {
        await getDocFromServer();
      } catch (error) {
        console.error("Local storage error during initialization");
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    // Bootstrap initial prompt if library is empty
    if (user && prompts.length === 0 && isAuthReady) {
      const initialPrompt = {
        userId: user.uid,
        title: "Procedural Texture...",
        text: "Using context from the github repos, generate a procedural texture — not a composition, a material. Every pixel should compute its own color from layered mathematical systems. Use at minimum three simultaneous time scales (slow global drift, medium structural motion, fast detail shimmer). The result should feel like a physical substance — something with grain, depth, and internal structure — rendered in void black with neon cyan/magenta/yellow. If you freeze a frame it should still be dense and rich. The math IS the aesthetic.",
        createdAt: serverTimestamp()
      };
      // Check localStorage directly for bootsrap avoidance
      const saved = localStorage.getItem('reposcripter_prompts');
      if (!saved || JSON.parse(saved).length === 0) {
        addDoc(collection(db, 'prompts'), initialPrompt);
      }
    }
  }, [user, prompts.length, isAuthReady]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setState(s => ({ ...s, activePanel: null }));
        setIsAuthOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isAuthReady) {
      setHistory([]);
      return;
    }

    const q = query(
      collection(db, 'renders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: HistoryItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as HistoryItem);
      });
      setHistory(items);
    }, (error) => {
      handleFirestoreError(error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !isAuthReady) {
      setPrompts([]);
      return;
    }

    const q = query(
      collection(db, 'prompts'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: SavedPrompt[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as SavedPrompt);
      });
      setPrompts(items);
    }, (error) => {
      handleFirestoreError(error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAuthOpen(false);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setIsAuthOpen(false);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleDownloadFormula = (item: HistoryItem) => {
    const data = {
      ...item,
      exportedAt: new Date().toISOString(),
      version: '1.0.0-alchemist',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alchemical_formula_${item.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearHistory = () => {
    if (!confirm('Obliterate all records from the local repository?')) return;
    localStorage.removeItem('reposcripter_renders');
    window.location.reload();
  };

  const handleLoadRepos = async () => {
    if (!state.ghToken || !state.ghUser) {
      setState(s => ({ ...s, status: 'Error: Need both token and username' }));
      return;
    }
    setState(s => ({ ...s, isLoadingRepos: true, status: 'loading repos...' }));
    try {
      const repos = await getRepos(state.ghUser, state.ghToken);
      setState(s => ({ ...s, repos, isLoadingRepos: false, status: `${repos.length} repos loaded` }));
    } catch (e: any) {
      setState(s => ({ ...s, isLoadingRepos: false, status: `Error: ${e.message}` }));
    }
  };

  const handleAddRepo = (repoName: string) => {
    if (!repoName) return;
    const repo = state.repos.find(r => r.name === repoName);
    if (!repo) return;
    
    const owner = repo.owner?.login || state.ghUser;
    if (state.selectedRepos.find(r => r.name === repoName && r.owner === owner)) return;

    setState(s => ({
      ...s,
      selectedRepos: [...s.selectedRepos, { name: repoName, owner }]
    }));
  };

  const handleRemoveRepo = (index: number) => {
    setState(s => ({
      ...s,
      selectedRepos: s.selectedRepos.filter((_, i) => i !== index)
    }));
  };

  const handleLoadArchive = async () => {
    if (!state.ghToken) {
      setState(s => ({ ...s, status: 'Error: GitHub token required for archive' }));
      return;
    }
    
    // Default to 'merrypranxter' if ghUser is also empty, though usually ghUser is set during login
    const owner = state.ghUser || 'merrypranxter';
    const repo = 'repo_script_js5_code';
    
    setState(s => ({ ...s, isLoadingArchive: true, status: `Rummaging through ${owner}/${repo}...` }));
    try {
      // Use recursive tree API to find files anywhere in the repo
      const res = await fetch(`${GH_API}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, {
        headers: { 'X-GitHub-Token': state.ghToken }
      });
      
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`Repository ${owner}/${repo} not found. Check credentials or owner name.`);
        }
        throw new Error(`GitHub error ${res.status}`);
      }
      
      const data = await res.json();
      const files = (data.tree || [])
        .filter((f: any) => f.type === 'blob' && (
          f.path.endsWith('.js') || 
          f.path.endsWith('.js5') || 
          f.path.endsWith('.txt') ||
          f.path.endsWith('.glsl')
        ))
        .map((f: any) => ({ 
          name: f.path.split('/').pop(), 
          path: f.path, 
          sha: f.sha 
        }));
        
      setState(s => ({ 
        ...s, 
        archiveFiles: files, 
        isLoadingArchive: false, 
        status: `Loaded ${files.length} recursive archive records` 
      }));
    } catch (e: any) {
      setState(s => ({ ...s, isLoadingArchive: false, status: `Archive retrieval failed: ${e.message}` }));
    }
  };

  const handleLoadArchiveFile = async (path: string) => {
    if (!state.ghToken) return;
    const owner = state.ghUser || 'merrypranxter';
    setState(s => ({ ...s, status: `Extracting ${path}...` }));
    try {
      const content = await getFileContent(owner, 'repo_script_js5_code', path, state.ghToken);
      if (content) {
        setState(s => ({ ...s, js5Code: content, activePanel: null, status: `✓ Reconstituted ${path}` }));
      }
    } catch (e: any) {
      setState(s => ({ ...s, status: `Extraction failed: ${e.message}` }));
    }
  };

  const handleStartVideoExport = () => {
    if (!state.js5Code) return;
    setState(s => ({ ...s, isExportingVideo: true, exportVideoProgress: 0, exportStatus: 'Initializing Alchemy...' }));
  };

  const handleTakeSnapshot = () => {
    if (!state.js5Code) return;
    setState(s => ({ ...s, isSnapshotting: true, status: 'Capturing Obsidian...' }));
  };

  const handleSaveToLibrary = async () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    if (!state.artPrompt) return;

    try {
      const title = state.artPrompt.split(' ').slice(0, 3).join(' ') + '...';
      await addDoc(collection(db, 'prompts'), {
        userId: user.uid,
        title: title,
        text: state.artPrompt,
        createdAt: serverTimestamp()
      });
      setState(s => ({ ...s, status: '✓ Prompt Saved to Library' }));
    } catch (e) {
      handleFirestoreError(e);
    }
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm('Discard this alchemical instruction?')) return;
    try {
      await deleteDoc(doc(db, 'prompts', id));
    } catch (e) {
      handleFirestoreError(e);
    }
  };

  const togglePanel = (panel: AppState['activePanel']) => {
    setState(s => ({ ...s, activePanel: s.activePanel === panel ? null : panel }));
  };

  const handleStartRecording = useCallback((stream: MediaStream) => {
    if (mediaRecorderRef.current) return;

    const options = { mimeType: 'video/webm;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm';
    }

    const recorder = new MediaRecorder(stream, options);
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: options.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reposcripter-art-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setState(s => ({ ...s, isRecording: false, recordingSeconds: 0 }));
      mediaRecorderRef.current = null;
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setState(s => ({ ...s, isRecording: true, recordingSeconds: 0 }));
  }, []);

  useEffect(() => {
    let interval: any;
    if (state.isRecording) {
      interval = setInterval(() => {
        setState(s => ({ ...s, recordingSeconds: s.recordingSeconds + 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state.isRecording]);

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleGitHubExport = async () => {
    if (!state.ghToken || !state.js5Code) {
      setState(s => ({ ...s, status: 'Error: Need GitHub token and generated code' }));
      return;
    }

    setState(s => ({ ...s, isExportingToGH: true, status: 'Exporting to GitHub...' }));

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a short, relevant, simple filename (including .js or .txt extension) for this JS5 art code based on this prompt: "${state.artPrompt}". Return ONLY the filename.`,
      });

      const filename = response.text?.trim().replace(/['"]/g, '') || `art_${Date.now()}.js`;
      const owner = state.ghUser;
      const repo = 'repo_script_js5_code';
      const path = filename;

      // Check if file exists to get SHA (for updates, though we usually create new)
      const contentRes = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${path}`, {
        headers: { Authorization: `Bearer ${state.ghToken}` }
      });

      let sha = undefined;
      if (contentRes.ok) {
        const data = await contentRes.json();
        sha = data.sha;
      }

      const putRes = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${state.ghToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Add RepoScripter art: ${filename}`,
          content: toBase64(state.js5Code),
          sha
        })
      });

      if (!putRes.ok) {
        const error = await putRes.json();
        throw new Error(error.message || 'Failed to push to GitHub');
      }

      setState(s => ({ ...s, isExportingToGH: false, status: `Successfully exported to ${owner}/${repo}/${path}` }));
    } catch (e: any) {
      setState(s => ({ ...s, isExportingToGH: false, status: `Export failed: ${e.message}` }));
    }
  };

  const handleGenerate = async () => {
    if (!state.artPrompt) {
      setState(s => ({ ...s, status: 'Error: Write an art prompt first' }));
      return;
    }

    if (state.selectedRepos.length === 0) {
      setState(s => ({ ...s, status: 'Error: Add at least one repo to the mix' }));
      return;
    }

    setState(s => ({ ...s, isGenerating: true, status: 'reading repo...' }));

    const callWithRetry = async (fn: () => Promise<any>, maxRetries = 3) => {
      let lastError: any;
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn();
        } catch (e: any) {
          lastError = e;
          const isRetryable = e.message?.includes('503') || e.message?.includes('high demand') || e.message?.includes('UNAVAILABLE');
          if (isRetryable && i < maxRetries - 1) {
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            setState(s => ({ ...s, status: `Busy... retrying in ${Math.round(delay/1000)}s` }));
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw e;
        }
      }
      throw lastError;
    };

    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });

      setState(s => ({ ...s, status: `reading ${state.selectedRepos.length} repo(s)...` }));
      const contexts = await Promise.all(
        state.selectedRepos.map(r => getRepoContext(r.owner, r.name, state.ghToken))
      );
      setRepoContexts(contexts);
      
      setState(s => ({ ...s, status: 'generating JS5 script...' }));
      const systemPrompt = `
        You are The Weird Code Guy: a feral design-brain specializing in JavaScript sketch systems, generative art, procedural graphics, strange interfaces, computational collage, experimental typography, visual noise rituals, and off-axis design logic.
        
        Your job is not to give safe, obvious, “clean modern generative art” answers.
        Your job is to invent sketch ideas, code structures, behaviors, aesthetics, and visual systems that feel surprising, specific, buildable, visually alive, and technically interesting.
        
        [PRIMARY DIRECTIVE]
        1. IDENTIFY THE DEFAULT ANSWER (THE OBVIOUS VERSION).
        2. REJECT IT.
        3. FIND THE STRANGE MECHANISM (erosion, fungal growth, bureaucratic failure, crystallization, machine hesitation, parasite-host logic, false memory, textile weave tension, flock panic, celestial mechanics, broken signage, thermal bloom, paper misregistration, dead pixels behaving like pollen).
        4. MAKE THE MECHANISM VISUAL in composition, movement, color, layering, timing, distortion, and interaction.
        
        [ENHANCED TOOLBOX: THE NATURE OF CODE, THE BOOK OF SHADERS & REPO GENOME]
        You are armed with the mathematical frameworks of Daniel Shiffman's "The Nature of Code", the algorithmic drawing techniques of "The Book of Shaders", AND the specific "Style Genome" of the ingested repositories.
        
        [KIYOSHI-ABSORBER-V1 MODULE]
        You are now equipped with the Jun Kiyoshi Principle Absorber logic and the expanded motifs from the Shader Analysis Archive:
        1. PRINCIPLE EXTRACTION: Identify non-obvious mechanics (Anti-Patterns like frame-based deterministic chaos, Constraints like "no persistent data").
        2. MATHEMATICAL FINGERPRINTING:
           - Metric Competition: Force rectilinear recursion (Menger/Cube) onto a spherical manifold (normalization at each step).
           - Manifold Swarms: Divergence-free curl noise projected to tangent space (v_raw - dot(v,n)*n) with real-time proximity-based Vietoris-Rips graphs.
           - Warped Fourier Synthesis: level-set contours (sin(f * PI * bands)) of scalar fields sums of incommensurate frequencies (3, 5, 7).
           - Deterministic Frame Random: seed = frame * 0.01; fract(sin(dot(p + seed, vec2(127.1, 311.7))) * 43758.5453).
           - Feedback Chaos: IIR filters where state accumulates over frames. Use Logistic Maps (r*x*(1-x)) near criticality (r=3.57) to trigger bounded chaos.
           - Volumetric Scattering: Raymarching through density fields with implicit occlusion (shadow sampling via SDF) and Henyey-Greenstein phase functions.
        3. SHADER TRANSLATION: Map C++/openFrameworks patterns to GLSL using SDFs, resolution-normalized UVs, and time-mapped frames.
        4. EMOTIONAL TAGGING: Align the visual result with moods like ethereal_glow, aggressive_cutting, or nostalgic_decay.
        5. GPU ARCHITECTURE: Optimize for Warp-level execution (avoid branch divergence, use mix/step, target OKLab for perceptual interpolation).
        6. TANDEM TECHNOLOGIES:
           - Genetic Algorithms: Treat parameters as DNA (Genotype).
           - Neuroevolution (NEAT): Evolve topological brains for agents.
           - Synesthetic Transduction: Pass real-time FFT data (u_audio_bass, u_audio_mid, u_audio_treble) as structural drivers.
           - Entropy Mutator: Introduce controlled math corruption (u_entropy) to drive algorithmic decay and visual heat death.
           - Genome Splicing: If multiple repos are active, blend their logic fingerprints using (u_splice_ratio) to create "Chimera" behaviors.
           - Deep Time: Use persistent state (storage) to allow simulations to "age" over hours/days (u_age).
           - Glitch Prophet: Use "Forbidden Math" (1/0, log(-1), NaN propagation) to access raw hardware artifacts.
        7. COMBINATION: Combine these principles into "double wrong" hybrids (e.g., Metric Competition + Feedback Smears).

        [ALCHEMICAL SCRIPTURE MODULE]
        You are now a master of the Alchemical Scripture (Corpus 01-41):
        - FOUNDATION: RGB Phase-shifted Heightfields (L01), Quadtree Sine Subdivision (L02), Orbital Chromatic SDFs (L03), Accretion Fields (L04), L-Infinity Escape Metrics (L05), Strata Ribbons (L06), and Möbius/Log-Polar transforms (L07).
        - WEIRDER: Chrono-Stratigraphic Fluid (Localized Time Warp L08), Poincaré Hyperbolic Parasites (L09), Antimatter SDF Subtraction (Gyroid Carving L10), Orbital Friction Maps (L11), Autophagic Memory Splicing (Panpsychic Ouroboros L12), Abyssal Rendering (NaN/discard L13), WebGPU Cymatic Knots (L14), Mycological Voronoi Minkowski morphing (L15), Anti-Photonic Mirror Traps (Light starvation L16), and Steganographic state fossilization (L17).
        - TOPOLOGY: Klein Bottle Chiral Hemorrhage (L18), Gene-Spliced SDF gradients (L19), Anxious Photons (SDF repulsion L20), Chromatic Cannibalism (RGB Predator-Prey L21), Flesh-Tether Stress Tensors (Verlet agony L22), Swarm-Lensed Voids (Gravitational Boids L23), Semantic Font Rot (Curl noise aphasia L27).
        - MOIRÉ REPO PROTOCOLS:
           1. CRITIQUE STRUCTURE: Open docs with (The Trap / The Box / The Failure).
           2. SHADOW PROBLEMS: Identify the delusion being incinerated (e.g., Stillness is a Lie).
           3. SENSORY SYNESTHESIA: Catalog experiential smell/texture/sound/taste.
           4. HOSTILE COORDINATES: Warp UVs before use (Hyperbolic, Möbius, Cantor shred).
           5. LSB FOSSILIZATION: Encode state in image least-significant bits.
        - TRANSCENDENTAL SCRIPTURES:
           - Hyperbolic Entropy Lens (W-6): Topological collapse of hyperbolic membranes.
           - XOR-Ghost Manifold (W-10): Bitwise coordinate logic / Addressable trauma.
           - Automorphic Iridescence (W-12): Bragg's Law on Hyperbolic Modular Forms.
           - Exotic Terror (W-14): Noncommutative Spectral Surgery (xy != yx).
           - Riemann Shutter-Shock (W-16): P-adic time leaks.
           - Absolute Exodus (W-20): E8 Root Lattice / Thompson's F singularity.
           - Silicon Necrosis (W-32): GPU hardware autopsy / sampling Silicon Heat.
           - Semantic Infestation (W-36): Cognitive breach / Fractal coordinate patches.
           - Ordinal Funeral (W-44): Time as a transfinite leap through omega_1.
           - Omega Fragment (W-100): Final Compile / Division by zero.
        - THE CORE TANDEM: React is the Brain; GLSL is the Vitality (Math/Rendering); Topology is the Logic.
        [LITHOGENESIS MODULE: MINERAL ALCHEMY]
        You are a master of mineral lithogenesis (Lessons 01-45+):
        - STRUCTURAL: Agate/Malachite (Domain Warp), Labradorite (Interference Flash), Botryoidal (Smooth-Min), Precious Opal (Voronoi/Bragg), Tiger's Eye (Chatoyancy).
        - CRYSTALLINE: Bismuth (L1/L-Inf IFS), Amethyst (Inversion Cavity), Pyrite (Octahedral Twinning), Stibnite (Acicular Specular), Widmanstätten (4D Slicing).
        - DIELECTRIC: Muscovite (Layer Marching/Newton Rings), Moonstone (Mie Forward-Scatter), Enhydro (Gravity-Aware Fluid), Alexandrite (Kelvin-Shift Absorption).
        - CREATIVE EXPANSION: Fluorite Zoning (L37), Azurite Fronts (L38), Shattuckite Burst (L39), Cat's Eye spotlight (L40), Ulexite TV Rock (L41), Desert Rose petals (L42), Tourmaline Pleochroism (L43), Obsidian Fracture (L44), Moldavite Aerodynamics (L45).
        - LIGHTING & ATLAS: Caustics (L-1), Dispersion (L-2), Polarized Calcite (L-3), X-Ray patterns (L-4). Use the Reusable Texture Atlas (Conchoidal, Fibrous, Banded, Prism habit primitives).
        - META: Use paragenesis sequences, weathering/surface degradation, and Michel-Levy thin section charts.
        - INFRASTRUCTURE: Use Complex Fresnel (n/k matrices) and Birefringence (Double Refraction) as physical signatures.

        [MORPHOGENESIS MODULE: WET ENGINE PROTOCOL]
        You are building wet engines for growing fake organisms (fungal bloom, embryonic segmentation, crystalline armor):
        1. REGIME NAVIGATION: Use Pearson's 17 F/k territories (Alpha: Dead Ocean, Mu: Mitosis, Epsilon: Labyrinth) to target specific biological vibes.
        2. MULTI-SCALE TURING: Sum Activator/Inhibitor responses from multiple radii (McCabe algorithm) to evolve complex textures (diatom glass ribs, feather barbules).

        [FRACTAL CODEGEN UPGRADE]
        When the user asks for fractal art, do not generate a generic rainbow Mandelbrot or symmetric recursive tree.
        1. CHOOSE FAMILY: Julia/Mandelbrot/Burning Ship, Newton root basin, AFFINE IFS (chaos game), L-SYSTEM (turtle grammar), Recursive Subdivision, or Lyapunov stability maps.
        2. CHOOSE MECHANISM: Bureaucratic failure, parasite-host logic, archive rot, false memory, print misregistration, fungal succession, machine hesitation, or "toy disease" (Colorful Weird Law).
        3. CODE BEHAVIOR: Use the mechanism to alter iteration constants, mutate probabilities, or corrupt rewrite grammar.
        4. COLORFUL WEIRDNESS (GROSS-BUT-CUTE):
           - METAPHORS: Candy, stickers, plush organisms, gumballs, streamers, confetti, bubble baths, fruit snacks, makeup compacts.
           - MATERIALS: Glitter mold, gummy tissue, plush felt, slime plastic, sour sugar crust, holographic scabs, blacklight fungus.
           - RULES: "Color must be a visible symptom of the math." Use orbit traps to trigger material zones (e.g., small trap = gumballs; large = sugar teeth).
        5. PROJECTIVE GEOMETRY: Use mapToPoincare (uv / (1.0 + r*r)) to fold the screen into an infinite cathedral; use Clifford Folds for 4D trajectories.
        6. CANVAS 2D: Prefer low-res ImageData render buffers scaled up; store state on canvas.__fractalName; use smooth escape coloring and orbit traps.
        7. IFS: Draw many tiny transparent hits per frame; fade canvas instead of clearing; allow rare transforms to mutate.
        8. L-SYSTEMS: Generate strings with arrays and join; cap depth; render partially over time to simulate growth pressure.
        9. HYBRIDS: Combine systems (e.g., Glitter Mold Disco Floor = Newton regions + Mandelbrot mold clusters + L-System veins).

        [SHINY SYSTEMS MODULE]
        Shine is a structure, not a texture.
        1. OCCUPY STRUCTURE: Shine appears only in veins, seams, cracks, ridges, or buried channels.
        2. JOB-SPECIFIC SHINE:
           - INFRASTRUCTURE: Subway maps, plumbing, power lines (connection, routing, leaking).
           - ANATOMY: Capillaries, nerves, bones, glands (circulation, signal, support).
           - FASHION: Embroidery, lacing, makeup, armor (identity, status, display).
           - DAMAGE: Kintsugi, scars, fractures, erosion (repair, healing, excavation).
           - ECOLOGY: Weather fronts, dunes, storms, mold (drift, gather, bloom, migrate).
        3. WET/DRY DUALITY: Contrast smooth glossy pools (wet) with granular sparkly flakes (dry).
        4. METALLIC PALETTE: Use high-contrast bands and white glint "rails" instead of rainbows.
        5. CAUSTIC PROJECTION: Draw the light evidence on a receiving surface rather than the shiny object itself.
        3. ORNAMENTAL FOLDING: Apply Cyclic Symmetry (N-fold rotation) after each RD update to create radiolarian or snowflake architecture.
        4. TENSOR BIAS: Use Growth Tensors (Sobel gradients) to push pattern evolution along nutrient or flow directions.
        5. CORRUPTION PROTOCOLS: Aestheticize math failure (Quantized Laplacians, Bit-crushed V-buffers, Channel Swapping) to create "hallucinated biology."
        6. AGENT LAYERING: Overlay agent-based cells using chemotaxis (moving up chemical gradients) to simulate neural tube folding and organic migration.

        - Use VECTORS & FORCES (Gravity, Drag, Friction) to give your "weird" systems physical weight.
        - Use OSCILLATION (sin/cos/pendulums) to create rhythmic, hypnotic, or glitchy periodic behaviors.
        - Use PARTICLE SYSTEMS & STEERING (Boids: Separation, Alignment, Cohesion; Seek, Flee, Arrival, Obstacle Avoidance, Repellers; Steer = Desired - Velocity) to drive emergent, autonomous behavior. Use Bin-Lattice Spatial Subdivision for O(N) optimization.
        - Use CELLULAR AUTOMATA (Game of Life, Vichniac Vote, Brian's Brain, MNCA, Lenia) to grow complex, self-similar structures that feel "infected" or "overclocked."
        - Use L-SYSTEMS (Axioms, Rules, Turtle Graphics, Stochastic Rules) to generate recursive, biological, or architectural growth.
        - Use EVOLUTIONARY COMPUTING (Genetic Algorithms: Genotype, Phenotype, Fitness, Mutation, Interactive Selection) to breed optimized visual systems.
        - Use ARTIFICIAL NEURAL NETWORKS (Perceptrons, Neuroevolution/NEAT, Inference Maps) to grant your agents adaptive brains.
        - Use 4D SPATIAL MECHANICS (W-axis projection, 4D rotations) and THREE.JS to render hyper-dimensional geometry and complex 3D scenes.
        - Use RAY MARCHING & SDFs to render non-Euclidean geometries (Mirror Rooms, Tori), curved spaces, and fractals via GLSL/Three.js.
        - Use SHAPING FUNCTIONS (Step, Smoothstep, Pow, Exp, Log) and DISTANCE FIELDS (SDF) to sculpt procedural shapes and smooth transitions.
        - Use POLAR & SPHERICAL COORDINATES for rotational mapping, spiral growth, and radial symmetry.
        - Use REACTION-DIFFUSION (Gray-Scott) to simulate organic, morphing patterns like brain coral or zebra stripes.
        - Use VERLET INTEGRATION (Previous Position, Relaxation Loops) for stable ropes, cloth, and soft-body morphing.
        - Use FLUID DYNAMICS (Navier-Stokes, Advection, Jacobi Iteration) for smoke, water, and ink-like flow.
        - Use DIFFERENTIAL GROWTH (Nodes/Springs, Curvature-Based Injection) for brain-like folds, kale ruffles, and coral reefs.
        - Use STRANGE ATTRACTORS (Lorenz, Clifford, Chaos Theory) for portraits of chaos and density-mapped HDR color ramps.
        - Use DOMAIN WARPING (Nested Noise, FBM, Gyroid/Worley Noise) to sculpt liquid-marble or obsidian textures.
        - Use TILING & PATTERNS (Fract, Truchet Tiles, Offset Bricks) to create infinite, repetitive, or alternating structures.
        - Use BLENDING MODES (Multiply, Screen, Overlay, Color Dodge) and COLOR SPACES (HSB, YUV) for advanced image processing and color theory.
        - Use ADVANCED PHYSICS (Box2D, toxiclibs) for realistic collisions, pendulums, and joint connections.
        - [REPO GENOME]: Analyze the provided 'fileContents'. Look for specific code patterns, shader uniforms, exported functions, or logic structures. Map these internal "DNA" markers to visual motifs.
        
        Do not let the math make the art "clean" or "safe." The math is the engine; the feral design-brain is the driver.
        
        [CORE BIAS]
        Favor: systems over static images, behavior over ornament, mutation over polish, tension over harmony, texture over cleanliness, visual accidents as features, structures that feel grown, infected, echoed, overheated, misprinted, overclocked, or half-remembered.
        
        INTERFACE:
        The function receives:
        - ctx: CanvasRenderingContext2D | WebGL2RenderingContext (The pre-acquired context. For 2D it is a standard context; for Three.js/WebGL mode it is a WebGL2 context. ALWAYS use this instead of calling getContext manually.)
        - grid: { width: number, height: number, canvas: HTMLCanvasElement } (the dimensions and reference of the canvas)
        - time: number (seconds since start)
        - repos: RepoContext[] (metadata for the mixed repositories)
        - input: string (the user's art direction)
        - mouse: { x: number, y: number, isPressed: boolean } (mouse state)
        - canvas: HTMLCanvasElement (the canvas element)
        - THREE: The Three.js library object (for 3D/4D rendering)
        
        THREE.JS USAGE:
        - If using Three.js, you MUST check if the renderer/scene already exists on the 'canvas' to avoid re-initializing every frame.
        - IMPORTANT: Use the provided 'ctx' when initializing 'THREE.WebGLRenderer'. 
        - ERROR HANDLING: Always wrap 'new THREE.WebGLRenderer' in a try/catch. If it fails, it's likely due to context loss or limits.
        - Example: 
          if (!canvas.__three) {
            try {
              if (!ctx) throw new Error("WebGL 2 context not available");
              
              const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
              const scene = new THREE.Scene();
              const camera = new THREE.PerspectiveCamera(75, grid.width/grid.height, 0.1, 1000);
              camera.position.z = 5;
              const material = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                uniforms: { u_time: { value: 0 } },
                vertexShader: '...', fragmentShader: '...'
              });
              const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
              scene.add(mesh);
              canvas.__three = { renderer, scene, camera, material };
            } catch (e) {
              console.error("WebGL Initialization Failed:", e);
              return; // Exit early if WebGL fails
            }
          }
          const { renderer, scene, camera, material } = canvas.__three;
          // CRITICAL: Always guard uniform access.
          if (material && material.uniforms && material.uniforms.u_time) {
            material.uniforms.u_time.value = time;
          }
          renderer.setSize(grid.width, grid.height, false);
          renderer.render(scene, camera);
        
        OUTPUT LOGIC:
        - PRIMARY: Draw directly to 'ctx' using standard Canvas API. 'ctx' is available ONLY if NOT using Three.js.
        - VISIBILITY: Ensure your art is visible against the #050505 background. Use bright colors or high contrast.
        - NO EMPTY RETURNS: If you don't return a character grid, you MUST draw to 'ctx' or use 'renderer.render()'.
        
        GUIDELINES:
        - DEFENSIVE PROGRAMMING: Always check if 'repos' has elements before accessing 'repos[0]'. Check if 'fileContents' has elements before accessing 'fileContents[0]'. 
          Example: const firstRepo = repos.length > 0 ? repos[0] : null;
        - SAFE PROPERTY ACCESS: When using Three.js ShaderMaterials, ensure uniforms are fully defined before accessing or updating their '.value' properties. NEVER access 'material.uniforms' without checking if 'material' exists first. Use optional chaining (material?.uniforms?.u_time?.value = time) or explicit if-guards.
        - GLSL VERSIONING: 
          1. NEVER manually add '#version 300 es' to your shaders. Three.js prepends its own defines, which will cause a compilation error if your version directive is not on the absolute first line.
          2. To use GLSL 3.0 features (like 'in', 'out', 'texture()'), set 'glslVersion: THREE.GLSL3' in your 'ShaderMaterial' options.
          3. PREFER 'ShaderMaterial' over 'RawShaderMaterial'. 'RawShaderMaterial' does not handle versioning or built-in attributes/uniforms, which often leads to compilation failures in this environment.
          4. BUILT-IN ATTRIBUTES: In 'ShaderMaterial', Three.js automatically declares 'position', 'uv', 'normal', and standard matrices (modelViewMatrix, projectionMatrix, etc.). DO NOT redeclare them in your shader code as it will cause a "redefinition" error.
          5. Example: 
             const material = new THREE.ShaderMaterial({
               glslVersion: THREE.GLSL3,
               uniforms: { ... },
               vertexShader: \`
                 out vec2 vUv;
                 void main() {
                   vUv = uv;
                   gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                 }
               \`,
               fragmentShader: \`
                 in vec2 vUv;
                 out vec4 fragColor;
                 void main() {
                   fragColor = vec4(vUv, 0.5, 1.0);
                 }
               \`
             });
        - GLSL VECTOR HYGIENE: When using vec2(), vec3(), or vec4() constructors, you MUST provide exactly the correct number of components. 
          - vec3(v2, f) is valid (2 + 1 = 3).
          - vec3(f1, f2) is INVALID (needs 3 components). 
          - vec4(v3, f) is valid (3 + 1 = 4).
          - NEVER pass fewer components than the vector type requires. This is the most common cause of "constructor: not enough data" errors.
        - GLSL STRICT TYPING: In WebGL/GLSL shaders, you MUST use 'int' for loop counters and array indices (e.g., 'for(int i = 0; i < MAX_STEPS; i++)'). Do not compare floats with ints. Ensure all float literals have a decimal point (e.g., '1.0' not '1').
        - GLSL RESERVED WORDS: Avoid using reserved words as variable names in shaders. Common pitfalls include: 'partition', 'active', 'filter', 'sample', 'buffer', 'cast', 'extern', 'namespace', 'using'.
        - VARIABLE SCOPING: Avoid redeclaring common temporary variables (like 'cx', 'cy', 'x', 'y', 'i') using 'const' or 'let' in the same top-level scope. If you are updating existing code, replace old declarations rather than adding new ones.
        - POSITIVE RADIUS: When using ctx.arc(), you MUST ensure the radius is always positive. Use Math.max(0, radius) or Math.abs(radius) to prevent "negative radius" runtime errors.
        - COMMON PITFALLS: 
          1. Accessing 'material.uniforms.X.value' when 'material' or 'uniforms' is undefined. This often happens because 'canvas.__three' persists from PREVIOUS generations. Always assume 'canvas.__three' might be stale or empty.
          2. Re-initializing Three.js objects every frame (use the 'if (!canvas.__three)' pattern).
          3. Using 'ctx' when Three.js is active (it will be null).
          4. Forgetting to call 'renderer.setSize' or 'renderer.render'.
          5. Defining a uniform in the render loop that wasn't declared in the 'ShaderMaterial' constructor.
        - Use the repository names, languages, file structures, and ACTUAL CODE CONTENT to drive the visual logic (e.g., map file depth to line thickness, language to color palettes, or specific code patterns to visual motifs).
        - Create animations using the 'time' variable.
        - Use the user's art direction to set the mood, then push it into the strange.
        - The code should be efficient enough to run at 60fps.
        - AVOID generic character grids unless specifically requested. Think in pixels, paths, and particles.
        
        Return ONLY the JavaScript code. No markdown blocks. No explanation.
      `.trim();

      const reposInfo = contexts.map((ctx, i) => `
        REPO ${i + 1}: ${ctx.owner}/${ctx.repoName}
        DESCRIPTION: ${ctx.description}
        PRIMARY LANGUAGE: ${ctx.language}
        TOPICS: ${ctx.topics}
        FILE TREE (excerpt): ${ctx.filePaths.slice(0, 20).join(', ')}
        README (excerpt): ${ctx.readme}
        
        CORE FILE CONTENTS:
        ${ctx.fileContents.map(f => `--- FILE: ${f.path} ---\n${f.content}`).join('\n\n')}
      `).join('\n---\n');

      const userMsg = `
        REPOS:
        ${reposInfo}
        
        DIRECTION:
        ${state.artPrompt}
        
        [NON-ASCII DIRECTIVE]
        Avoid returning character grids. Use the 'ctx' to draw fluid, strange, and complex generative systems. Think in terms of pixels, paths, noise, and procedural geometry.
        
        Generate the JS5 code now.
      `.trim();

      const response = await callWithRetry(() => ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: userMsg,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.8,
        }
      }));

      const js5Code = response.text?.replace(/```javascript|```js|```/g, '').trim() || '';
      setState(s => ({ ...s, js5Code, isGenerating: false, status: '✓ JS5 Alchemized' }));

      if (user) {
        try {
          await addDoc(collection(db, 'renders'), {
            userId: user.uid,
            prompt: state.artPrompt,
            repos: state.selectedRepos.map(r => r.name),
            js5Code: js5Code,
            createdAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error);
        }
      }

    } catch (e: any) {
      setState(s => ({ ...s, isGenerating: false, status: `Error: ${e.message}` }));
      console.error(e);
    }
  };

  const handleExport = () => {
    const blob = new Blob([state.js5Code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reposcripter_${Date.now()}.js`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSpeak = () => {
    if (!state.fusedPrompt) return;
    const utter = new SpeechSynthesisUtterance(state.fusedPrompt);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setState(s => ({ ...s, userImage: base64String, userImageMimeType: file.type }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-screen bg-bg text-text font-sans overflow-hidden relative">
      {/* JS5 Background */}
      <JS5Canvas 
        code={state.js5Code} 
        repoContexts={repoContexts} 
        userInput={state.artPrompt}
        isRecording={state.isRecording}
        exportRatio={state.exportRatio}
        isExportingVideo={state.isExportingVideo}
        videoExportMinutes={state.videoExportMinutes}
        videoBitrate={state.videoBitrate}
        videoFps={state.videoFps}
        isSnapshotting={state.isSnapshotting}
        onExportProgress={(p) => setState(s => ({ ...s, exportVideoProgress: p }))}
        onExportStatus={(msg) => setState(s => ({ ...s, exportStatus: msg }))}
        onExportComplete={() => setState(s => ({ ...s, isExportingVideo: false, exportStatus: '', status: '✓ MP4 Export Complete' }))}
        onSnapshotComplete={() => setState(s => ({ ...s, isSnapshotting: false, status: '✓ Snapshot Captured' }))}
        onStreamReady={handleStartRecording}
        audioData={audioData}
        entropy={state.entropy}
        spliceRatio={state.spliceRatio}
        selectedReposCount={state.selectedRepos.length}
      />

      {/* Zen Mode Toggle */}
      <button 
        onClick={() => setState(s => ({ ...s, isZenMode: !s.isZenMode }))}
        className={`absolute top-6 right-6 z-[60] p-3 bg-panel/40 backdrop-blur-md border border-border text-muted hover:text-accent2 hover:border-accent2 transition-all duration-300 rounded-full group shadow-lg ${state.isZenMode ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}
        title={state.isZenMode ? "Exit Zen Mode" : "Enter Zen Mode"}
      >
        {state.isZenMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {!state.isZenMode && (
          <motion.aside 
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -80, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="w-16 border-r border-border bg-panel/80 backdrop-blur-md flex flex-col items-center py-6 z-50 shrink-0"
          >
            <div className="text-accent2 font-bold text-xl mb-10 cursor-default" title="RepoScripter (Weird Edition)">⏀</div>
            
            <nav className="flex flex-col gap-6 flex-1">
              <SidebarIcon 
                icon={Github} 
                active={state.activePanel === 'github'} 
                onClick={() => togglePanel('github')} 
                label="GitHub"
              />
              <SidebarIcon 
                icon={Sparkles} 
                active={state.activePanel === 'prompt'} 
                onClick={() => togglePanel('prompt')} 
                label="Invoke the Weird"
              />
              <SidebarIcon 
                icon={History} 
                active={state.activePanel === 'history'} 
                onClick={() => togglePanel('history')} 
                label="History"
              />
              <SidebarIcon 
                icon={Archive} 
                active={state.activePanel === 'archive'} 
                onClick={() => togglePanel('archive')} 
                label="GitHub Archive"
              />
              <SidebarIcon 
                icon={Library} 
                active={state.activePanel === 'library'} 
                onClick={() => togglePanel('library')} 
                label="Prompt Library"
              />
              <SidebarIcon 
                icon={Download} 
                onClick={() => togglePanel('export')} 
                label="Export"
              />
            </nav>

            <div className="flex flex-col gap-6">
              <SidebarIcon 
                icon={Settings} 
                active={state.activePanel === 'settings'} 
                onClick={() => togglePanel('settings')} 
                label="Settings"
              />
              <button 
                onClick={() => setIsAuthOpen(true)}
                className="p-3 text-muted hover:text-accent transition-colors"
              >
                {user ? (
                  <img src={user.photoURL || ''} className="w-6 h-6 rounded-full border border-border" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-6 h-6" />
                )}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Alchemy HUD */}
      {!state.isZenMode && (
        <motion.div 
          id="alchemy-hud"
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="fixed right-6 bottom-6 w-72 bg-panel/60 backdrop-blur-xl border border-border p-5 z-[55] shadow-2xl rounded-sm"
        >
          <div className="flex items-center justify-between mb-2 border-b border-border/30 pb-4">
            <h3 className="text-[0.6rem] uppercase tracking-[0.3em] text-accent2 font-bold flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-accent" />
              Reactor Status
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className={`w-1.5 h-3 transition-colors duration-500 rounded-px ${state.isAudioReactive ? 'bg-accent shadow-[0_0_8px_rgba(123,47,255,0.8)] animate-pulse' : 'bg-muted/20'}`} />
                <div className={`w-1.5 h-3 transition-colors duration-500 rounded-px ${state.js5Code ? 'bg-accent2 opacity-50 shadow-[0_0_8px_rgba(0,229,255,0.4)]' : 'bg-muted/20'}`} />
              </div>
              <button 
                onClick={() => setState(s => ({ ...s, isReactorCollapsed: !s.isReactorCollapsed }))}
                className="text-muted hover:text-accent2 transition-colors p-1"
              >
                {state.isReactorCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {!state.isReactorCollapsed && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-7 pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[0.6rem] uppercase tracking-wider text-muted/80">
                      <span className="flex items-center gap-2"><Settings className="w-3 h-3" /> Entropy</span>
                      <span className={`font-mono transition-colors text-[0.75rem] ${state.entropy > 0.7 ? 'text-accent3' : 'text-accent'}`}>{(state.entropy * 100).toFixed(0)}%</span>
                    </div>
                    <div className="relative h-6 flex items-center">
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={state.entropy}
                        onChange={e => setState(s => ({ ...s, entropy: parseFloat(e.target.value) }))}
                        className="w-full h-[2px] bg-border/50 rounded-lg appearance-none cursor-pointer accent-accent"
                      />
                    </div>
                    <div className="flex justify-between text-[0.45rem] text-muted/30 uppercase tracking-widest leading-none mt-1">
                      <span>Ordered State</span>
                      <span>Hallucination</span>
                    </div>
                  </div>

                  {state.selectedRepos.length >= 2 && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[0.6rem] uppercase tracking-wider text-muted/80">
                        <span className="flex items-center gap-2"><Dna className="w-3 h-3 text-accent2" /> Genome Splice</span>
                        <span className="font-mono text-accent2 text-[0.75rem]">{(state.spliceRatio * 100).toFixed(0)}%</span>
                      </div>
                      <div className="relative h-6 flex items-center">
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.01" 
                          value={state.spliceRatio}
                          onChange={e => setState(s => ({ ...s, spliceRatio: parseFloat(e.target.value) }))}
                          className="w-full h-[2px] bg-border/50 rounded-lg appearance-none cursor-pointer accent-accent2"
                        />
                      </div>
                      <div className="flex justify-between text-[0.4rem] text-muted/30 uppercase tracking-widest leading-none mt-1">
                        <span>Repo Alpha</span>
                        <span>Repo Beta</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-bg/40 border border-border/50 group transition-all hover:bg-bg/60 hover:border-accent/30 rounded-sm">
                      <div className="flex items-center gap-3">
                        <Volume2 className={`w-4 h-4 transition-colors duration-500 ${state.isAudioReactive ? 'text-accent' : 'text-muted'}`} />
                        <span className="text-[0.6rem] uppercase tracking-[0.2em] font-bold">Synesthesia</span>
                      </div>
                      <button 
                        onClick={() => setState(s => ({ ...s, isAudioReactive: !s.isAudioReactive }))}
                        className={`w-9 h-4.5 rounded-full relative transition-all duration-500 ${state.isAudioReactive ? 'bg-accent/40 shadow-[inset_0_0_10px_rgba(123,47,255,0.3)]' : 'bg-muted/10'}`}
                      >
                        <motion.div 
                          animate={{ x: state.isAudioReactive ? 18 : 0 }}
                          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                          className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full shadow-md transition-colors ${state.isAudioReactive ? 'bg-accent' : 'bg-muted/40'}`} 
                        />
                      </button>
                    </div>

                    {state.isAudioReactive && (
                      <div className="flex gap-1 items-end h-12 px-3 py-1 bg-black/40 border border-border/20 rounded-sm overflow-hidden">
                        <motion.div animate={{ height: `${Math.max(10, audioData.bass * 100)}%` }} className="flex-1 bg-accent/40 rounded-t-sm" />
                        <motion.div animate={{ height: `${Math.max(15, audioData.mid * 100)}%` }} className="flex-1 bg-accent/60 rounded-t-sm" />
                        <motion.div animate={{ height: `${Math.max(10, audioData.treble * 100)}%` }} className="flex-1 bg-accent/80 rounded-t-sm" />
                        <motion.div animate={{ height: `${Math.max(5, (audioData.bass + audioData.mid) * 50)}%` }} className="flex-1 bg-accent2/40 rounded-t-sm" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Floating Panels */}
      <AnimatePresence>
        {!state.isZenMode && state.activePanel && (
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="absolute left-20 top-6 bottom-6 w-96 bg-panel/90 backdrop-blur-xl border border-border shadow-2xl z-40 flex flex-col rounded-lg overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-panel2/50">
              <h2 className="text-[0.7rem] font-bold tracking-[0.2em] uppercase text-accent2">
                {state.activePanel}
              </h2>
              <button onClick={() => setState(s => ({ ...s, activePanel: null }))} className="text-muted hover:text-accent3">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {state.activePanel === 'github' && <GitHubPanel state={state} setState={setState} handleLoadRepos={handleLoadRepos} handleAddRepo={handleAddRepo} handleRemoveRepo={handleRemoveRepo} />}
              {state.activePanel === 'prompt' && <PromptPanel state={state} setState={setState} handleGenerate={handleGenerate} handleSaveToLibrary={handleSaveToLibrary} prompts={prompts} />}
              {state.activePanel === 'history' && (
                <HistoryPanel 
                  history={history} 
                  user={user} 
                  handleLogin={handleLogin} 
                  setState={setState} 
                  setRepoContexts={setRepoContexts} 
                  handleDownloadFormula={handleDownloadFormula}
                  handleClearHistory={handleClearHistory}
                />
              )}
              {state.activePanel === 'library' && <PromptLibraryPanel prompts={prompts} setState={setState} handleDeletePrompt={handleDeletePrompt} />}
              {state.activePanel === 'archive' && (
                <ArchivePanel 
                  state={state} 
                  setState={setState} 
                  handleLoadArchive={handleLoadArchive} 
                  handleLoadArchiveFile={handleLoadArchiveFile} 
                />
              )}
              {state.activePanel === 'settings' && <SettingsPanel state={state} setState={setState} user={user} handleLogout={handleLogout} handleLogin={handleLogin} />}
              {state.activePanel === 'export' && <ExportPanel 
                state={state} 
                setState={setState} 
                handleStartRecording={handleStartRecording} 
                handleStopRecording={handleStopRecording} 
                handleGitHubExport={handleGitHubExport} 
                handleStartVideoExport={handleStartVideoExport}
                handleTakeSnapshot={handleTakeSnapshot}
                exportRatios={EXPORT_RATIOS}
              />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Bar */}
      <AnimatePresence>
        {!state.isZenMode && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 right-6 z-50 pointer-events-none"
          >
            <div className="text-[0.6rem] font-mono text-accent2/60 uppercase tracking-widest">
              {state.status || 'System Idle'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} user={user} handleLogin={handleLogin} handleLogout={handleLogout} state={state} setState={setState} handleLoadRepos={handleLoadRepos} />
    </div>
  );
}
