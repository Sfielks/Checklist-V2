/**
 * @typedef {'none' | 'low' | 'medium' | 'high' | 'urgent'} Priority
 * @description Represents the priority levels for a task.
 */
export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

/**
 * @interface SubItemBlock
 * @description Represents a sub-item content block within a task.
 * @property {string} id - The unique identifier for the sub-item.
 * @property {'subitem'} type - The type of the content block.
 * @property {string} text - The text content of the sub-item.
 * @property {boolean} completed - The completion status of the sub-item.
 * @property {SubItemBlock[]} children - Any nested sub-items.
 */
export interface SubItemBlock {
  id: string;
  type: 'subitem';
  text: string;
  completed: boolean;
  children: SubItemBlock[];
}

/**
 * @interface TextBlock
 * @description Represents a text content block within a task.
 * @property {string} id - The unique identifier for the text block.
 * @property {'text'} type - The type of the content block.
 * @property {string} text - The text content of the block.
 */
export interface TextBlock {
  id: string;
  type: 'text';
  text: string;
}

/**
 * @interface AttachmentBlock
 * @description Represents an attachment content block within a task.
 * @property {string} id - The unique identifier for the attachment.
 * @property {'attachment'} type - The type of the content block.
 * @property {string} fileName - The name of the attached file.
 * @property {string} fileType - The MIME type of the attached file.
 * @property {string} dataUrl - The data URL of the attached file.
 * @property {number} size - The size of the attached file in bytes.
 */
export interface AttachmentBlock {
  id: string;
  type: 'attachment';
  fileName: string;
  fileType: string;
  dataUrl: string;
  size: number;
}

/**
 * @typedef {SubItemBlock | TextBlock | AttachmentBlock} ContentBlock
 * @description Represents a union of all possible content block types.
 */
export type ContentBlock = SubItemBlock | TextBlock | AttachmentBlock;

/**
 * @interface TaskType
 * @description Represents a task in the checklist application.
 * @property {string} id - The unique identifier for the task.
 * @property {string} title - The title of the task.
 * @property {ContentBlock[]} content - The content blocks within the task.
 * @property {Priority} [priority] - The priority of the task.
 * @property {string} [dueDate] - The due date of the task.
 * @property {string} [category] - The category of the task.
 * @property {boolean} archived - The archived status of the task.
 * @property {string} [color] - The color of the task.
 */
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
