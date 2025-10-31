export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface SubItemBlock {
  id: string;
  type: 'subitem';
  text: string;
  completed: boolean;
  children: SubItemBlock[];
}

export interface TextBlock {
  id: string;
  type: 'text';
  text: string;
}

export interface AttachmentBlock {
  id: string;
  type: 'attachment';
  fileName: string;
  fileType: string;
  dataUrl: string;
  size: number;
}

export type ContentBlock = SubItemBlock | TextBlock | AttachmentBlock;

export interface TaskType {
  id:string;
  title: string;
  content: ContentBlock[];
  priority?: Priority;
  dueDate?: string;
  category?: string;
  archived: boolean;
  color?: string;
}

export interface SavedAnalysis {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}