import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Plus, Minus, Upload, RotateCw, Sun, Moon, Share2, Save, HelpCircle, Undo, Redo, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';

// Define a type for our lamp settings
type LampSettings = {
  position: { x: number; y: number };
  size: number;
  rotation: number;
  lightStartY: number;
  lightWidth: number;
  lightColor: string;
  isLightOn: boolean;
};

const defaultLampSettings: LampSettings = {
  position: { x: 50, y: 50 },
  size: 30,
  rotation: 0,
  lightStartY: 100,
  lightWidth: 50,
  lightColor: '#FFD700', // Default to a warm yellow color
  isLightOn: true,
};

const LampVisualizer: React.FC = () => {
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [lampImage, setLampImage] = useState<string | null>(null);
  const [lampSettings, setLampSettings] = useState<LampSettings>(defaultLampSettings);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [history, setHistory] = useState<LampSettings[]>([defaultLampSettings]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const roomInputRef = useRef<HTMLInputElement>(null);
  const lampInputRef = useRef<HTMLInputElement>(null);
  const componentRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && roomImage) {
      drawScene(canvas);
    }
  }, [roomImage, lampImage, lampSettings, isDarkMode]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, setImage: React.Dispatch<React.SetStateAction<string | null>>) => {
    const file = event.target.files?.[0];
    if (file && file.type.substr(0, 5) === "image") {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLampSelect = (lampNumber: number) => {
    setLampImage(`/lamps/${lampNumber}.png`);
  };

  const handleLampMove = (direction: 'left' | 'right' | 'up' | 'down') => {
    const step = 5;
    const newPos = { ...lampSettings.position };
    if (direction === 'left') newPos.x = Math.max(0, newPos.x - step);
    if (direction === 'right') newPos.x = Math.min(100, newPos.x + step);
    if (direction === 'up') newPos.y = Math.max(0, newPos.y - step);
    if (direction === 'down') newPos.y = Math.min(100, newPos.y + step);
    updateLampSettings({ position: newPos });
  };

  const handleLampResize = (increase: boolean) => {
    const step = 5;
    const newSize = increase ? Math.min(100, lampSettings.size + step) : Math.max(10, lampSettings.size - step);
    updateLampSettings({ size: newSize });
  };

  const handleLampRotate = () => {
    const newRotation = (lampSettings.rotation + 15) % 360;
    updateLampSettings({ rotation: newRotation });
  };

  const toggleLight = () => {
    updateLampSettings({ isLightOn: !lampSettings.isLightOn });
  };

  const resetToDefault = () => {
    setLampSettings(defaultLampSettings);
    setHistory([defaultLampSettings]);
    setHistoryIndex(0);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setLampSettings(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setLampSettings(history[historyIndex + 1]);
    }
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (isClickOnLamp(x, y)) {
      setIsDragging(true);
      setDragStart({ x, y });
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    setLampSettings(prev => ({
      ...prev,
      position: {
        x: Math.max(0, Math.min(100, prev.position.x + (dx / canvas.width) * 100)),
        y: Math.max(0, Math.min(100, prev.position.y + (dy / canvas.height) * 100)),
      },
    }));

    setDragStart({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const isClickOnLamp = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !lampImage) return false;

    const lampWidth = (lampSettings.size / 100) * canvas.width;
    const lampHeight = (lampSettings.size / 100) * canvas.height;
    const lampX = (lampSettings.position.x / 100) * canvas.width - lampWidth / 2;
    const lampY = (lampSettings.position.y / 100) * canvas.height - lampHeight / 2;

    return (
      x >= lampX &&
      x <= lampX + lampWidth &&
      y >= lampY &&
      y <= lampY + lampHeight
    );
  };

  const saveDesign = async () => {
    if (canvasContainerRef.current) {
      try {
        const canvas = await html2canvas(canvasContainerRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: null, // This will make the background transparent
        });

        // Trim the canvas to remove white space
        const trimmedCanvas = trimCanvas(canvas);

        const dataUrl = trimmedCanvas.toDataURL('image/png');
        
        if (dataUrl === 'data:,') {
          throw new Error('Failed to generate image');
        }

        const link = document.createElement('a');
        link.download = 'lamp-design.png';
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error saving design:', error);
        alert('Failed to save the image. Please try again.');
      }
    }
  };

  // New function to trim the canvas
  const trimCanvas = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const context = canvas.getContext('2d');
    if (!context) return canvas;

    const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    let left = canvas.width;
    let right = 0;
    let top = canvas.height;
    let bottom = 0;

    for (let x = 0; x < canvas.width; x++) {
      for (let y = 0; y < canvas.height; y++) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha !== 0) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    }

    const trimmedCanvas = document.createElement('canvas');
    const trimmedContext = trimmedCanvas.getContext('2d');
    if (!trimmedContext) return canvas;

    const trimmedWidth = right - left + 1;
    const trimmedHeight = bottom - top + 1;
    trimmedCanvas.width = trimmedWidth;
    trimmedCanvas.height = trimmedHeight;

    trimmedContext.drawImage(
      canvas,
      left, top, trimmedWidth, trimmedHeight,
      0, 0, trimmedWidth, trimmedHeight
    );

    return trimmedCanvas;
  };

  const shareDesign = () => {
    const canvas = canvasRef.current;
    if (canvas && navigator.share) {
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'lamp-design.png', { type: 'image/png' });
          try {
            await navigator.share({
              files: [file],
              title: 'My Lamp Design',
              text: 'Check out my lamp design!',
            });
          } catch (error) {
            console.error('Error sharing:', error);
          }
        }
      });
    } else {
      alert('Sharing is not supported on this device or browser.');
    }
  };

  const drawScene = (canvas: HTMLCanvasElement, scale: number = 1): Promise<void> => {
    return new Promise((resolve, reject) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('No canvas context');
        reject(new Error('No canvas context'));
        return;
      }

      // Set canvas size
      canvas.width = canvas.offsetWidth * scale;
      canvas.height = canvas.offsetHeight * scale;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!roomImage) {
        // Draw placeholder
        ctx.fillStyle = isDarkMode ? '#1F2937' : '#F3F4F6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = isDarkMode ? '#4B5563' : '#9CA3AF';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No room image uploaded', canvas.width / 2, canvas.height / 2);
        resolve();
        return;
      }

      const roomImg = new Image();
      roomImg.src = roomImage;
      roomImg.onload = () => {
        // Calculate scaling to fit the entire image
        const scaleX = canvas.width / roomImg.width;
        const scaleY = canvas.height / roomImg.height;
        const scale = Math.min(scaleX, scaleY);

        // Calculate position to center the image
        const x = (canvas.width - roomImg.width * scale) / 2;
        const y = (canvas.height - roomImg.height * scale) / 2;

        // Clear canvas and draw room image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(roomImg, x, y, roomImg.width * scale, roomImg.height * scale);

        // Draw lamp if available
        if (lampImage) {
          const lampImg = new Image();
          lampImg.src = lampImage;
          lampImg.onload = () => {
            const lampWidth = (lampSettings.size / 100) * canvas.width;
            const lampHeight = (lampImg.height / lampImg.width) * lampWidth;
            const lampX = (lampSettings.position.x / 100) * canvas.width - lampWidth / 2;
            const lampY = (lampSettings.position.y / 100) * canvas.height - lampHeight / 2;

            // Draw light effect if lamp is on
            if (lampSettings.isLightOn) {
              const lightStartPoint = {
                x: lampX + lampWidth / 2,
                y: lampY + lampHeight * (lampSettings.lightStartY / 100)
              };
              const gradient = ctx.createRadialGradient(
                lightStartPoint.x, lightStartPoint.y, 0,
                lightStartPoint.x, canvas.height, canvas.height * (lampSettings.lightWidth / 100)
              );
              gradient.addColorStop(0, getLightColor(lampSettings.lightColor));
              gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

              ctx.globalCompositeOperation = 'screen';
              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.moveTo(lightStartPoint.x, lightStartPoint.y);
              ctx.lineTo(lightStartPoint.x - canvas.width * (lampSettings.lightWidth / 200), canvas.height);
              ctx.lineTo(lightStartPoint.x + canvas.width * (lampSettings.lightWidth / 200), canvas.height);
              ctx.closePath();
              ctx.fill();
              ctx.globalCompositeOperation = 'source-over';
            }

            // Draw lamp
            ctx.save();
            ctx.translate(lampX + lampWidth / 2, lampY + lampHeight / 2);
            ctx.rotate((lampSettings.rotation * Math.PI) / 180);
            ctx.drawImage(lampImg, -lampWidth / 2, -lampHeight / 2, lampWidth, lampHeight);
            ctx.restore();

            // Apply darkness if lamp is off
            if (!lampSettings.isLightOn) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            resolve();
          };
          lampImg.onerror = () => reject(new Error('Failed to load lamp image'));
        } else {
          resolve();
        }
      };
      roomImg.onerror = () => {
        console.error('Failed to load room image');
        resolve();
      };
    });
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const getLightColor = (color: string) => {
    return color + 'CC';  // Add 80% opacity
  };

  const updateLampSettings = (newSettings: Partial<LampSettings>) => {
    setLampSettings(prev => {
      const updated = { ...prev, ...newSettings };
      setHistory(history.slice(0, historyIndex + 1).concat(updated));
      setHistoryIndex(historyIndex + 1);
      return updated;
    });
  };

  return (
    <div className={`rounded-lg shadow-2xl p-8 max-w-4xl w-full mx-auto my-8 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Lamp Visualizer</h2>
        <div className="flex space-x-2">
          <button 
            onClick={toggleDarkMode} 
            className={`p-2 rounded-full transition shadow-md ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
          <button 
            onClick={() => setShowGuide(!showGuide)} 
            className={`p-2 rounded-full transition shadow-md ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            <HelpCircle size={24} />
          </button>
        </div>
      </div>
      
      {showGuide && (
        <div className={`p-4 rounded-lg shadow-inner mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <h3 className="text-lg font-semibold mb-2">How to Use</h3>
          <ol className={`list-decimal pl-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <li>Upload a room image or choose from presets</li>
            <li>Select a lamp or upload your own</li>
            <li>Use arrow buttons to position the lamp</li>
            <li>Adjust lamp size with + and - buttons</li>
            <li>Rotate the lamp using the rotation control</li>
            <li>Turn the light on/off and adjust its properties</li>
            <li>Save or share your design</li>
          </ol>
        </div>
      )}
      
      <div className="relative">
        <div ref={canvasContainerRef} className="w-full h-128 mb-6 relative overflow-hidden rounded-lg shadow-inner">
          <canvas 
            ref={canvasRef} 
            className="w-full h-full cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          {!roomImage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Upload a room image to visualize</p>
            </div>
          )}
        </div>
        
        {/* Control buttons around the canvas */}
        <div className="absolute top-2 left-2 flex space-x-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, setRoomImage)}
            ref={roomInputRef}
            className="hidden"
          />
          <button onClick={() => roomInputRef.current?.click()} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition shadow-md">
            <Upload size={20} />
          </button>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, setLampImage)}
            ref={lampInputRef}
            className="hidden"
          />
          <button onClick={() => lampInputRef.current?.click()} className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition shadow-md">
            <Upload size={20} />
          </button>
        </div>
        
        <div className="absolute top-2 right-2 flex space-x-2">
          <button onClick={undo} disabled={historyIndex === 0} className="p-2 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
            <Undo size={20} />
          </button>
          <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
            <Redo size={20} />
          </button>
          <button onClick={resetToDefault} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-md">
            <RefreshCw size={20} />
          </button>
        </div>
        
        <div className="absolute bottom-2 left-2 flex space-x-2">
          <button onClick={() => handleLampMove('left')} className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition shadow-md">
            <ArrowLeft size={20} />
          </button>
          <button onClick={() => handleLampMove('up')} className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition shadow-md">
            <ArrowUp size={20} />
          </button>
          <button onClick={() => handleLampMove('down')} className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition shadow-md">
            <ArrowDown size={20} />
          </button>
          <button onClick={() => handleLampMove('right')} className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition shadow-md">
            <ArrowRight size={20} />
          </button>
        </div>
        
        <div className="absolute bottom-2 right-2 flex space-x-2">
          <button onClick={() => handleLampResize(false)} className="p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition shadow-md">
            <Minus size={20} />
          </button>
          <button onClick={() => handleLampResize(true)} className="p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition shadow-md">
            <Plus size={20} />
          </button>
          <button onClick={handleLampRotate} className="p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition shadow-md">
            <RotateCw size={20} />
          </button>
          <button onClick={toggleLight} className="p-2 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition shadow-md">
            {lampSettings.isLightOn ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>
      
      {/* Lamp selection buttons */}
      <div className="flex justify-center space-x-4 mt-4 mb-6">
        {[1, 2, 3].map((num) => (
          <button 
            key={num}
            onClick={() => handleLampSelect(num)} 
            className="p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition shadow-md flex items-center justify-center"
          >
            <img src={`/lamps/${num}.png`} alt={`Lamp ${num}`} className="w-10 h-10 object-contain" />
          </button>
        ))}
      </div>
      
      {/* Light controls */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div>
          <label htmlFor="lightStartY" className="block text-sm font-medium mb-1">Light Start Position</label>
          <input
            type="range"
            id="lightStartY"
            min="0"
            max="100"
            value={lampSettings.lightStartY}
            onChange={(e) => updateLampSettings({ lightStartY: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="lightWidth" className="block text-sm font-medium mb-1">Light Width</label>
          <input
            type="range"
            id="lightWidth"
            min="10"
            max="100"
            value={lampSettings.lightWidth}
            onChange={(e) => updateLampSettings({ lightWidth: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="lightColor" className="block text-sm font-medium mb-1">Light Color</label>
          <input
            type="color"
            id="lightColor"
            value={lampSettings.lightColor}
            onChange={(e) => updateLampSettings({ lightColor: e.target.value })}
            className="w-full h-10 rounded-lg"
          />
        </div>
      </div>
      
      {/* Save and Share buttons */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <button onClick={saveDesign} className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center justify-center shadow-md">
          <Save className="mr-2" size={20} />
          Save Design
        </button>
        <button onClick={shareDesign} className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center shadow-md">
          <Share2 className="mr-2" size={20} />
          Share Design
        </button>
      </div>
    </div>
  );
};

export default LampVisualizer;
