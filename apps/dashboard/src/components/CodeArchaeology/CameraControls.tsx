import React from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3 } from 'three';

interface CameraControlsProps {
  onReset?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onPan?: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

const CameraControls: React.FC<CameraControlsProps> = ({
  onReset,
  onZoomIn,
  onZoomOut,
  onPan,
}) => {
  const { camera } = useThree();

  const handleReset = () => {
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    onReset?.();
  };

  const handleZoomIn = () => {
    const direction = new Vector3();
    camera.getWorldDirection(direction);
    camera.position.add(direction.multiplyScalar(2));
    onZoomIn?.();
  };

  const handleZoomOut = () => {
    const direction = new Vector3();
    camera.getWorldDirection(direction);
    camera.position.add(direction.multiplyScalar(-2));
    onZoomOut?.();
  };

  const handlePan = (direction: 'up' | 'down' | 'left' | 'right') => {
    const panDistance = 2;
    const right = new Vector3();
    const up = new Vector3();
    
    camera.getWorldDirection(new Vector3());
    right.setFromMatrixColumn(camera.matrix, 0);
    up.setFromMatrixColumn(camera.matrix, 1);

    switch (direction) {
      case 'up':
        camera.position.add(up.multiplyScalar(panDistance));
        break;
      case 'down':
        camera.position.add(up.multiplyScalar(-panDistance));
        break;
      case 'left':
        camera.position.add(right.multiplyScalar(-panDistance));
        break;
      case 'right':
        camera.position.add(right.multiplyScalar(panDistance));
        break;
    }
    
    onPan?.(direction);
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
      <h4 className="text-xs font-semibold mb-2 text-gray-700">Camera Controls</h4>
      
      <div className="grid grid-cols-3 gap-1 mb-2">
        <div></div>
        <button
          onClick={() => handlePan('up')}
          className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
          title="Pan Up"
        >
          ↑
        </button>
        <div></div>
        
        <button
          onClick={() => handlePan('left')}
          className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
          title="Pan Left"
        >
          ←
        </button>
        <button
          onClick={handleReset}
          className="p-1 bg-blue-100 hover:bg-blue-200 rounded text-xs"
          title="Reset View"
        >
          ⌂
        </button>
        <button
          onClick={() => handlePan('right')}
          className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
          title="Pan Right"
        >
          →
        </button>
        
        <div></div>
        <button
          onClick={() => handlePan('down')}
          className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
          title="Pan Down"
        >
          ↓
        </button>
        <div></div>
      </div>

      <div className="flex gap-1">
        <button
          onClick={handleZoomIn}
          className="flex-1 p-1 bg-green-100 hover:bg-green-200 rounded text-xs"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="flex-1 p-1 bg-red-100 hover:bg-red-200 rounded text-xs"
          title="Zoom Out"
        >
          −
        </button>
      </div>
    </div>
  );
};

export default CameraControls;