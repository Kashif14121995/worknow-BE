import { Injectable, Logger } from '@nestjs/common';
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

