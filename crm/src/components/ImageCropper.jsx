import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { X, ZoomIn, ZoomOut, Check } from 'lucide-react'

// Helper to create image from URL
const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener('load', () => resolve(image))
        image.addEventListener('error', (error) => reject(error))
        image.setAttribute('crossOrigin', 'anonymous')
        image.src = url
    })

// Helper to get cropped image blob
const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) return null

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    )

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob)
        }, 'image/jpeg', 0.9)
    })
}

function ImageCropper({ image, onCropComplete, onCancel }) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

    const onCropChange = useCallback((crop) => {
        setCrop(crop)
    }, [])

    const onZoomChange = useCallback((zoom) => {
        setZoom(zoom)
    }, [])

    const onCropCompleteInternal = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const handleSave = async () => {
        try {
            const croppedImageBlob = await getCroppedImg(image, croppedAreaPixels)
            onCropComplete(croppedImageBlob)
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <div className="cropper-modal-overlay">
            <div className="cropper-modal-container animate-fade-in">
                <header className="cropper-header">
                    <h3>Adjust Profile Picture</h3>
                    <button className="close-btn" onClick={onCancel}>
                        <X size={20} />
                    </button>
                </header>

                <div className="cropper-body">
                    <div className="cropper-wrapper">
                        <Cropper
                            image={image}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            onCropChange={onCropChange}
                            onCropComplete={onCropCompleteInternal}
                            onZoomChange={onZoomChange}
                            cropShape="round"
                            showGrid={false}
                        />
                    </div>
                </div>

                <footer className="cropper-footer">
                    <div className="zoom-controls">
                        <ZoomOut size={16} />
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="zoom-range"
                        />
                        <ZoomIn size={16} />
                    </div>

                    <div className="cropper-actions">
                        <button className="btn btn-secondary" onClick={onCancel}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            <Check size={18} />
                            Save Picture
                        </button>
                    </div>
                </footer>
            </div>

            <style>{`
        .cropper-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .cropper-modal-container {
          background: var(--bg-secondary);
          width: 100%;
          max-width: 500px;
          border-radius: var(--radius-xl);
          border: 1px solid var(--border);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        .cropper-header {
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
        }

        .cropper-body {
          position: relative;
          height: 400px;
          background: #000;
        }

        .cropper-wrapper {
          position: absolute;
          inset: 0;
        }

        .cropper-footer {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: var(--bg-tertiary);
        }

        .zoom-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--text-secondary);
        }

        .zoom-range {
          flex: 1;
          -webkit-appearance: none;
          height: 4px;
          background: var(--border);
          border-radius: 2px;
          outline: none;
        }

        .zoom-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: var(--accent);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
        }

        .cropper-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 4px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .close-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
      `}</style>
        </div>
    )
}

export default ImageCropper
