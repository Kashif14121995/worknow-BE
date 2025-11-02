import { Injectable, Logger } from '@nestjs/common';

// Polyfills for browser APIs required by pdf-parse/pdfjs-dist
if (typeof global !== 'undefined' && typeof global.DOMMatrix === 'undefined') {
  // DOMMatrix polyfill
  global.DOMMatrix = class DOMMatrix {
    constructor(init?: string | DOMMatrixInit) {
      if (typeof init === 'string') {
        const parts = init.split(',');
        if (parts.length >= 6) {
          this.a = parseFloat(parts[0]) || 1;
          this.b = parseFloat(parts[1]) || 0;
          this.c = parseFloat(parts[2]) || 0;
          this.d = parseFloat(parts[3]) || 1;
          this.e = parseFloat(parts[4]) || 0;
          this.f = parseFloat(parts[5]) || 0;
        } else {
          this.a = 1;
          this.b = 0;
          this.c = 0;
          this.d = 1;
          this.e = 0;
          this.f = 0;
        }
      } else if (init) {
        this.a = init.a ?? 1;
        this.b = init.b ?? 0;
        this.c = init.c ?? 0;
        this.d = init.d ?? 1;
        this.e = init.e ?? 0;
        this.f = init.f ?? 0;
      } else {
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.e = 0;
        this.f = 0;
      }
    }
    a: number = 1;
    b: number = 0;
    c: number = 0;
    d: number = 1;
    e: number = 0;
    f: number = 0;
    m11: number = 1;
    m12: number = 0;
    m21: number = 0;
    m22: number = 1;
    m41: number = 0;
    m42: number = 0;
    static fromMatrix(other?: DOMMatrixInit) {
      return new DOMMatrix(other);
    }
    static fromFloat32Array(array32: Float32Array) {
      if (array32.length >= 6) {
        return new DOMMatrix({
          a: array32[0],
          b: array32[1],
          c: array32[2],
          d: array32[3],
          e: array32[4],
          f: array32[5],
        });
      }
      return new DOMMatrix();
    }
    static fromFloat64Array(array64: Float64Array) {
      if (array64.length >= 6) {
        return new DOMMatrix({
          a: array64[0],
          b: array64[1],
          c: array64[2],
          d: array64[3],
          e: array64[4],
          f: array64[5],
        });
      }
      return new DOMMatrix();
    }
    invertSelf() {
      const det = this.a * this.d - this.b * this.c;
      if (det === 0) return this;
      const a = this.a;
      const b = this.b;
      const c = this.c;
      const d = this.d;
      const e = this.e;
      const f = this.f;
      this.a = d / det;
      this.b = -b / det;
      this.c = -c / det;
      this.d = a / det;
      this.e = (c * f - d * e) / det;
      this.f = (b * e - a * f) / det;
      return this;
    }
    multiplySelf(other: DOMMatrixInit) {
      const a = this.a;
      const b = this.b;
      const c = this.c;
      const d = this.d;
      const e = this.e;
      const f = this.f;
      this.a = a * (other.a ?? 1) + c * (other.b ?? 0);
      this.b = b * (other.a ?? 1) + d * (other.b ?? 0);
      this.c = a * (other.c ?? 0) + c * (other.d ?? 1);
      this.d = b * (other.c ?? 0) + d * (other.d ?? 1);
      this.e = a * (other.e ?? 0) + c * (other.f ?? 0) + e;
      this.f = b * (other.e ?? 0) + d * (other.f ?? 0) + f;
      return this;
    }
    preMultiplySelf(other: DOMMatrixInit) {
      const a = this.a;
      const b = this.b;
      const c = this.c;
      const d = this.d;
      const e = this.e;
      const f = this.f;
      this.a = (other.a ?? 1) * a + (other.c ?? 0) * b;
      this.b = (other.b ?? 0) * a + (other.d ?? 1) * b;
      this.c = (other.a ?? 1) * c + (other.c ?? 0) * d;
      this.d = (other.b ?? 0) * c + (other.d ?? 1) * d;
      this.e = (other.a ?? 1) * e + (other.c ?? 0) * f + (other.e ?? 0);
      this.f = (other.b ?? 0) * e + (other.d ?? 1) * f + (other.f ?? 0);
      return this;
    }
    rotateSelf(angle: number, originX?: number, originY?: number) {
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const x = originX ?? 0;
      const y = originY ?? 0;
      this.translateSelf(x, y);
      const a = this.a;
      const b = this.b;
      const c = this.c;
      const d = this.d;
      this.a = a * cos + c * sin;
      this.b = b * cos + d * sin;
      this.c = c * cos - a * sin;
      this.d = d * cos - b * sin;
      this.translateSelf(-x, -y);
      return this;
    }
    scaleSelf(scaleX: number, scaleY?: number, originX?: number, originY?: number) {
      const sx = scaleX;
      const sy = scaleY ?? scaleX;
      const x = originX ?? 0;
      const y = originY ?? 0;
      this.translateSelf(x, y);
      this.a *= sx;
      this.b *= sx;
      this.c *= sy;
      this.d *= sy;
      this.translateSelf(-x, -y);
      return this;
    }
    skewXSelf(sx: number) {
      const tan = Math.tan((sx * Math.PI) / 180);
      this.a += this.c * tan;
      this.b += this.d * tan;
      return this;
    }
    skewYSelf(sy: number) {
      const tan = Math.tan((sy * Math.PI) / 180);
      this.c += this.a * tan;
      this.d += this.b * tan;
      return this;
    }
    translateSelf(tx: number, ty: number) {
      this.e += this.a * tx + this.c * ty;
      this.f += this.b * tx + this.d * ty;
      return this;
    }
    setMatrixValue(transformList: string) {
      // Simplified implementation
      const parts = transformList.split(',');
      if (parts.length >= 6) {
        this.a = parseFloat(parts[0]) || 1;
        this.b = parseFloat(parts[1]) || 0;
        this.c = parseFloat(parts[2]) || 0;
        this.d = parseFloat(parts[3]) || 1;
        this.e = parseFloat(parts[4]) || 0;
        this.f = parseFloat(parts[5]) || 0;
      }
      return this;
    }
  } as any;
}

if (typeof global !== 'undefined' && typeof global.ImageData === 'undefined') {
  // ImageData polyfill
  global.ImageData = class ImageData {
    constructor(data: Uint8ClampedArray | number, widthOrHeight?: number, height?: number) {
      if (data instanceof Uint8ClampedArray) {
        this.data = data;
        this.width = widthOrHeight!;
        this.height = height!;
      } else {
        const size = data * (widthOrHeight || 1) * 4;
        this.data = new Uint8ClampedArray(size);
        this.width = data;
        this.height = widthOrHeight || 1;
      }
    }
    data: Uint8ClampedArray;
    width: number;
    height: number;
  } as any;
}

if (typeof global !== 'undefined' && typeof global.Path2D === 'undefined') {
  // Path2D polyfill - minimal implementation
  global.Path2D = class Path2D {
    constructor(path?: string | Path2D) {
      // Minimal implementation - most methods can be no-ops for text extraction
    }
    addPath(path: Path2D, transform?: DOMMatrix2DInit): void {
      // No-op
    }
    arc(
      x: number,
      y: number,
      radius: number,
      startAngle: number,
      endAngle: number,
      counterclockwise?: boolean,
    ): void {
      // No-op
    }
    arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
      // No-op
    }
    bezierCurveTo(
      cp1x: number,
      cp1y: number,
      cp2x: number,
      cp2y: number,
      x: number,
      y: number,
    ): void {
      // No-op
    }
    closePath(): void {
      // No-op
    }
    ellipse(
      x: number,
      y: number,
      radiusX: number,
      radiusY: number,
      rotation: number,
      startAngle: number,
      endAngle: number,
      counterclockwise?: boolean,
    ): void {
      // No-op
    }
    lineTo(x: number, y: number): void {
      // No-op
    }
    moveTo(x: number, y: number): void {
      // No-op
    }
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
      // No-op
    }
    rect(x: number, y: number, w: number, h: number): void {
      // No-op
    }
    roundRect(
      x: number,
      y: number,
      w: number,
      h: number,
      radii?: number | DOMPointInit | (number | DOMPointInit)[],
    ): void {
      // No-op
    }
  } as any;
}

// Now require pdf-parse after polyfills are in place
const pdfParse = require('pdf-parse');

@Injectable()
export class ResumeParserService {
  private readonly logger = new Logger(ResumeParserService.name);

  /**
   * Extract text from PDF buffer
   */
  async extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(pdfBuffer);
      return data.text;
    } catch (error) {
      this.logger.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  /**
   * Parse resume text and extract structured information
   */
  async parseResume(text: string): Promise<{
    name?: string;
    email?: string;
    phone?: string;
    skills?: string[];
    education?: string;
    experience?: number;
    jobHistory?: string[];
  }> {
    const normalizedText = text.toLowerCase();
    const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

    const result: any = {
      skills: [],
      jobHistory: [],
    };

    // Extract email
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const emailMatch = text.match(emailRegex);
    if (emailMatch && emailMatch.length > 0) {
      result.email = emailMatch[0];
    }

    // Extract phone
    const phoneRegex = /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch && phoneMatch.length > 0) {
      result.phone = phoneMatch[0];
    }

    // Extract name (usually first line or before email)
    if (lines.length > 0 && !lines[0].includes('@') && !lines[0].match(/\d/)) {
      result.name = lines[0];
    }

    // Extract experience (look for patterns like "5 years", "10+ years", etc.)
    const experienceRegex = /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/gi;
    const expMatch = normalizedText.match(experienceRegex);
    if (expMatch && expMatch.length > 0) {
      const years = expMatch.map((match) => {
        const numMatch = match.match(/(\d+)/);
        return numMatch ? parseInt(numMatch[1], 10) : 0;
      });
      result.experience = Math.max(...years);
    }

    // Extract skills (look for common skill sections)
    const skillKeywords = [
      'skills',
      'technical skills',
      'core competencies',
      'expertise',
      'proficiencies',
      'qualifications',
    ];

    let skillsSectionFound = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (skillKeywords.some((keyword) => line.includes(keyword))) {
        skillsSectionFound = true;
        // Extract skills from next few lines
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const skillLine = lines[j];
          // Split by common separators
          const skills = skillLine.split(/[,;|•\-\–]/).map((s) => s.trim()).filter((s) => s.length > 2);
          result.skills.push(...skills);
        }
        break;
      }
    }

    // If no skills section found, look for common technical terms
    if (!skillsSectionFound) {
      const commonSkills = [
        'javascript',
        'python',
        'java',
        'react',
        'node.js',
        'mongodb',
        'sql',
        'aws',
        'docker',
        'kubernetes',
        'git',
        'agile',
        'scrum',
        'excel',
        'word',
        'powerpoint',
        'customer service',
        'communication',
        'leadership',
        'project management',
        'forklift',
        'warehouse',
        'manufacturing',
        'packing',
        'shipping',
        'quality control',
      ];

      for (const skill of commonSkills) {
        if (normalizedText.includes(skill.toLowerCase())) {
          result.skills.push(skill);
        }
      }
    }

    // Extract education
    const educationKeywords = ['education', 'university', 'college', 'degree', 'bachelor', 'master', 'phd', 'diploma'];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (educationKeywords.some((keyword) => line.includes(keyword))) {
        // Get education line and next few lines
        const educationLines = lines.slice(i, Math.min(i + 5, lines.length));
        result.education = educationLines.join(' ');
        break;
      }
    }

    // Extract job history (look for work experience, employment history)
    const jobKeywords = [
      'work experience',
      'employment history',
      'professional experience',
      'experience',
      'work history',
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (jobKeywords.some((keyword) => line.includes(keyword))) {
        // Extract job titles from next 20 lines
        for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
          const jobLine = lines[j];
          // Look for job titles (usually shorter lines, might have dates)
          if (jobLine.length < 100 && jobLine.length > 5) {
            // Check if it looks like a job title (has common words like "developer", "manager", etc.)
            const titleKeywords = [
              'developer',
              'engineer',
              'manager',
              'specialist',
              'analyst',
              'coordinator',
              'assistant',
              'worker',
              'operator',
              'technician',
              'supervisor',
            ];
            if (titleKeywords.some((keyword) => jobLine.toLowerCase().includes(keyword))) {
              result.jobHistory.push(jobLine);
            }
          }
        }
        break;
      }
    }

    // Remove duplicates from skills
    result.skills = [...new Set(result.skills as string[])].filter((s: string) => s && s.length > 2);

    // Clean up job history
    result.jobHistory = result.jobHistory.slice(0, 10); // Limit to 10 most recent

    return result;
  }

  /**
   * Parse resume from PDF buffer
   */
  async parseResumeFromPdf(pdfBuffer: Buffer): Promise<{
    name?: string;
    email?: string;
    phone?: string;
    skills?: string[];
    education?: string;
    experience?: number;
    jobHistory?: string[];
  }> {
    const text = await this.extractTextFromPdf(pdfBuffer);
    return this.parseResume(text);
  }
}

