import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    
    if (!fs.existsSync(uploadDir)) {
      return NextResponse.json({ error: 'Directory does not exist', path: uploadDir });
    }

    const files = fs.readdirSync(uploadDir);
    const fileStats = [];

    for (const file of files) {
      if (file.endsWith('.mp4')) {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        fileStats.push({
          name: file,
          sizeBytes: stats.size,
          sizeMb: (stats.size / (1024 * 1024)).toFixed(2),
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        });
      }
    }

    // Sort by modification time descending
    fileStats.sort((a, b) => b.modifiedAt - a.modifiedAt);

    return NextResponse.json({
      directory: uploadDir,
      totalMp4Files: fileStats.length,
      files: fileStats.slice(0, 10) // Top 10 latest
    });
  } catch (error) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
