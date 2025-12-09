import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';

export function Sheet({ isOpen, onClose, title, children, width = '400px' }) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const sheetRef = useRef(null);
  
  // Handle mount/unmount for exit animations
  useEffect(() => {
    if (isOpen) setIsMounted(true);
  }, [isOpen]);

  // Animation effect
  useEffect(() => {
    if (!isMounted) return;

    const sheet = sheetRef.current;
    const mainContent = document.getElementById('main-content');
    
    // GSAP Context for cleanup
    let ctx = gsap.context(() => {
      if (isOpen) {
        // Open animation
        gsap.to(sheet, {
          x: 0,
          duration: 0.5,
          ease: 'power3.out'
        });

        if (mainContent) {
          gsap.to(mainContent, {
            marginRight: width,
            duration: 0.5,
            ease: 'power3.out'
          });
        }
      } else {
        // Close animation
        gsap.to(sheet, {
          x: '100%',
          duration: 0.4,
          ease: 'power3.inOut',
          onComplete: () => setIsMounted(false)
        });

        if (mainContent) {
          gsap.to(mainContent, {
            marginRight: 0,
            duration: 0.4,
            ease: 'power3.inOut'
          });
        }
      }
    });

    return () => ctx.revert();
  }, [isOpen, isMounted, width]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Panel */}
      <div 
        ref={sheetRef}
        className="absolute top-0 right-0 h-full bg-white shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] flex flex-col border-l border-gray-200 pointer-events-auto"
        style={{ width, transform: 'translateX(100%)' }} // Start off-screen
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
