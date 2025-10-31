import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type, Modality, LiveServerMessage, Blob } from '@google/genai';
import { XIcon, MicrophoneIcon, SpinnerIcon } from './Icons';

type ConversationStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'processing' | 'error';

// --- Audio Helper Functions ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- Gemini Function Declaration ---
const createTasksFunctionDeclaration: FunctionDeclaration = {
  name: 'createTasks',
  description: 'Cria uma ou mais tarefas com títulos e uma lista de subtarefas. Use esta função sempre que o usuário pedir para criar, adicionar ou anotar uma tarefa, lista de compras, checklist, etc.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      tasks: {
        type: Type.ARRAY,
        description: 'Uma lista de tarefas a serem criadas.',
        items: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'O título principal da tarefa ou lista. Por exemplo, "Lista de compras" ou "Finalizar relatório".',
            },
            subItems: {
              type: Type.ARRAY,
              description: 'Uma lista de strings representando os subitens ou subtarefas. Por exemplo, ["Comprar leite", "Pagar contas"].',
              items: {
                type: Type.STRING,
              },
            },
          },
          required: ['title'],
        },
      },
    },
    required: ['tasks'],
  },
};

// --- Component ---
interface LiveConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksCreated: (tasks: Array<{ title: string; subItems: string[] }>) => void;
}

const LiveConversationModal: React.FC<LiveConversationModalProps> = ({ isOpen, onClose, onTasksCreated }) => {
  const [status, setStatus] = useState<ConversationStatus>('idle');
  const [transcript, setTranscript] = useState<Array<{ type: 'user' | 'model'; text: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  
  const stopConversation = useCallback(async () => {
    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {
        console.error("Error closing session:", e);
      }
      sessionPromiseRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setStatus('idle');
  }, []);

  const startConversation = useCallback(async () => {
    if (status !== 'idle' && status !== 'error') return;

    if (!process.env.API_KEY) {
      setError("A chave da API do Gemini não foi configurada.");
      setStatus('error');
      return;
    }
    
    setStatus('connecting');
    setError(null);
    setTranscript([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      let currentInputTranscription = '';
      let currentOutputTranscription = '';

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('listening');
            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = inputAudioContext;
            
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTranscription += text;
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscription += text;
            }

            if (message.serverContent?.turnComplete) {
              if (currentInputTranscription.trim()) {
                setTranscript(prev => [...prev, { type: 'user', text: currentInputTranscription.trim() }]);
              }
              if (currentOutputTranscription.trim()) {
                setTranscript(prev => [...prev, { type: 'model', text: currentOutputTranscription.trim() }]);
              }
              currentInputTranscription = '';
              currentOutputTranscription = '';
            }

            if (message.toolCall?.functionCalls) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'createTasks' && fc.args.tasks) {
                  onTasksCreated(fc.args.tasks as Array<{ title: string; subItems: string[] }>);
                }
                 sessionPromiseRef.current?.then((session) => {
                    session.sendToolResponse({
                        functionResponses: { id: fc.id, name: fc.name, response: { result: "ok, tarefas criadas." } }
                    });
                });
              }
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error("Session error:", e);
            setError("Ocorreu um erro na conexão. Tente novamente.");
            setStatus('error');
            stopConversation();
          },
          onclose: () => {
             setStatus('idle');
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [createTasksFunctionDeclaration] }],
          systemInstruction: "Você é um assistente de voz para um aplicativo de checklist. Seu objetivo é ajudar o usuário a criar tarefas de forma rápida e eficiente. Seja conciso e amigável. Use a função 'createTasks' para criar as tarefas solicitadas. Se algo não estiver claro, faça uma pergunta curta para confirmar antes de criar a tarefa.",
        },
      });
      sessionPromiseRef.current = sessionPromise;

    } catch (err) {
      console.error("Error starting conversation:", err);
      setError("Não foi possível acessar o microfone. Verifique as permissões do seu navegador.");
      setStatus('error');
    }
  }, [onTasksCreated, stopConversation, status]);
  
  useEffect(() => {
    if (isOpen) {
        startConversation();
    } else {
        stopConversation();
    }
    return () => {
        stopConversation();
    };
  }, [isOpen, startConversation, stopConversation]);

  const handleClose = () => {
    stopConversation();
    onClose();
  };

  const statusInfo = {
    idle: { text: 'Toque para falar', color: 'bg-teal-600', hover: 'hover:bg-teal-700' },
    connecting: { text: 'Conectando...', color: 'bg-yellow-500', hover: 'hover:bg-yellow-600' },
    listening: { text: 'Ouvindo...', color: 'bg-red-600', hover: 'hover:bg-red-700' },
    speaking: { text: 'Falando...', color: 'bg-blue-500', hover: 'hover:bg-blue-600' },
    processing: { text: 'Processando...', color: 'bg-gray-500', hover: 'hover:bg-gray-600' },
    error: { text: 'Erro', color: 'bg-red-700', hover: 'hover:bg-red-800' },
  };

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 ${isOpen ? 'visible' : 'invisible'}`}
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-700 animate-fade-in-scale flex flex-col h-[70vh] max-h-[600px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-2xl font-bold text-teal-600 dark:text-teal-400 flex items-center gap-3">
             <MicrophoneIcon />
             <span>Criar Tarefas com IA</span>
          </h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Fechar">
            <XIcon />
          </button>
        </div>
        
        <div className="flex-grow p-6 overflow-y-auto space-y-4">
            {transcript.length === 0 && status !== 'error' && (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                    <p className="text-lg">Diga algo como:</p>
                    <p className="mt-2 font-semibold text-gray-700 dark:text-gray-300">"Criar uma lista de compras com leite, pão e ovos."</p>
                    <p className="mt-4 text-sm">A IA irá criar a tarefa para você.</p>
                </div>
            )}
            {transcript.map((item, index) => (
                <div key={index} className={`flex ${item.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${item.type === 'user' ? 'bg-teal-100 dark:bg-teal-900/50 text-gray-800 dark:text-gray-200' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                        {item.text}
                    </div>
                </div>
            ))}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-center">
                    <p className="font-semibold">Ocorreu um erro:</p>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            )}
        </div>
        
        <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
            <button
                onClick={status === 'idle' || status === 'error' ? startConversation : stopConversation}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all duration-300 transform focus:outline-none focus:ring-4 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${statusInfo[status].color} ${statusInfo[status].hover} ${status === 'listening' ? 'scale-110' : ''}`}
                aria-label={status === 'idle' || status === 'error' ? 'Iniciar conversa' : 'Parar conversa'}
            >
                {status === 'connecting' || status === 'processing' ? <SpinnerIcon /> : <MicrophoneIcon />}
            </button>
            <p className="mt-4 text-sm font-semibold text-gray-600 dark:text-gray-300">{statusInfo[status].text}</p>
        </div>

      </div>
    </div>
  );
};

export default LiveConversationModal;