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

export type ContentBlock = SubItemBlock | TextBlock;

export interface TaskType {
  id:string;
  title: string;
  content: ContentBlock[];
  priority?: Priority;
  dueDate?: string;
  category?: string;
  archived: boolean;
}