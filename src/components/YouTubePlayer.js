'use client'
import React, { useEffect, useRef, useState } from 'react';

const YouTubePlayer = ({ videoId, isPlaying, onReady, onStateChange }) => {
  const iframeRef = useRef(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadYouTubeAPI = () => {
      return new Promise((resolve, reject) => {
        if (!window.YT) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          const firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
          window.onYouTubeIframeAPIReady = () => resolve(window.YT);
        } else {
          resolve(window.YT);
        }
      });
    };

    const initPlayer = async () => {
      try {
        const YT = await loadYouTubeAPI();
        new YT.Player(iframeRef.current, {
          height: '0',
          width: '0',
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            origin: window.location.origin,
            enablejsapi: 1,
          },
          events: {
            onReady: (event) => {
              console.log('YouTube player is ready');
              onReady(event);
            },
            onStateChange: onStateChange,
            onError: (event) => {
              console.error('YouTube player error:', event.data);
              if (retryCount < 3) {
                setRetryCount(retryCount + 1);
                initPlayer();
              }
            },
          },
        });
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
      }
    };

    initPlayer();
  }, [videoId, onReady, onStateChange, retryCount]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      const message = isPlaying ? '{"event":"command","func":"playVideo","args":""}' : '{"event":"command","func":"pauseVideo","args":""}';
      try {
        iframe.contentWindow.postMessage(message, '*');
      } catch (error) {
        console.error('Error posting message to YouTube player:', error);
      }
    }
  }, [isPlaying]);

  return <div ref={iframeRef} />;
};

export default YouTubePlayer;