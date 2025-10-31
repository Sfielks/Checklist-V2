<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Advanced Checklist Application

This is a comprehensive checklist application that allows users to create, manage, and organize their tasks. It features a user-friendly interface with support for sub-items, attachments, priorities, and categories. The application is built with React, TypeScript, and Vite, and it uses local storage for data persistence in guest mode and a mock cloud storage for authenticated users.

## Features

-   **Task Management**: Create, edit, and delete tasks with titles, descriptions, and due dates.
-   **Sub-items**: Break down complex tasks into smaller, manageable sub-items.
-   **Attachments**: Add attachments to tasks, including images and other files.
-   **Priorities and Categories**: Organize tasks with customizable priorities and categories.
-   **Drag and Drop**: Reorder tasks and content blocks with an intuitive drag-and-drop interface.
-   **Light and Dark Modes**: Switch between light and dark themes for a comfortable viewing experience.
-   **Data Persistence**: Save your tasks to local storage or sync them with the cloud.
-   **Export and Import**: Back up your data by exporting it to a JSON file and import it back when needed.
-   **Notifications**: Get notified about tasks that are due on the current day.

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v14 or later)
-   [npm](https://www.npmjs.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/your-repository.git
    cd your-repository
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up environment variables:**
    -   Create a `.env.local` file in the root of the project.
    -   Add your Gemini API key to the file:
        `GEMINI_API_KEY=your-api-key`
4.  **Run the development server:**
    ```bash
    npm run dev
    ```

The application will be available at `http://localhost:3000`.

## Usage

-   **Guest Mode**: Click the "Continuar como convidado" button to use the application without authentication. Your data will be saved to your browser's local storage.
-   **Apple Login**: Click the "Entrar com a Apple" button to simulate a user login. Your data will be saved to a mock cloud storage.
-   **Creating a Task**: Click the "Nova Tarefa" button to add a new task to the list.
-   **Editing a Task**: Click on the task title to edit it. You can also change the priority, due date, and category.
-   **Adding Content**: Use the buttons at the bottom of each task card to add sub-items, text blocks, or attachments.
-   **Filtering and Sorting**: Use the sidebar to filter tasks by category, priority, and status.
-   **Settings**: Click the settings icon to open the settings modal, where you can change the theme, manage notifications, and export or import your data.

## Project Structure

-   `src/components`: Contains all the React components used in the application.
-   `src/types.ts`: Defines the TypeScript types and interfaces used throughout the project.
-   `src/App.tsx`: The main application component that handles the core logic and state management.
-   `src/index.tsx`: The entry point of the application.

## Contributing

Contributions are welcome! If you have any suggestions or find any bugs, please open an issue or submit a pull request.
