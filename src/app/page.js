'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, X,Library, PlusCircle, 
  Play, Pause, SkipBack, SkipForward, 
  Volume, Volume1, Volume2, VolumeX, 
  List, Heart, LogOut, MoreVertical, 
  Plus, User, Compass, Trash2, Edit, 
  Shuffle, Trash, Menu, Radio, GripVertical, 
  ChevronDown 
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { doSignOut } from '../firebase/auth';
import { useAuth } from '../components/AuthProvider';
import axios from 'axios';
import ErrorBoundary from '../components/ErrorBoundary';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '../components/ui/slider'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  NavigationMenuLink,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"
import { db } from '../firebase/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Edit2 } from 'lucide-react';

const YouTubePlayer = dynamic(() => import('../components/YouTubePlayer'), { ssr: false });
const LdrsComponents = dynamic(() => import('../components/LdrsComponents'), { ssr: false });
const ClientOnlyBouncy = dynamic(() => import('../components/ClientOnlyBouncy'), { ssr: false });
const ClientOnlyWobble = dynamic(() => import('../components/ClientOnlyWobble'), { ssr: false });

let exploreCache = null;
let podcastCache = null;
let lastExploreCacheTime = 0;
let lastPodcastCacheTime = 0;

const isCacheValid = (lastCacheTime, interval) => {
  const now = Date.now();
  return lastCacheTime > 0 && (now - lastCacheTime) < interval;
};
const PODCAST_CACHE_INTERVAL = 600000; 

const sanitizePlaylistName = (name) => {
  const sanitized = name.replace(/[^a-zA-Z0-9 ]/g, '');
  const trimmed = sanitized.trim();
  return trimmed.slice(0, 50);
};

const formatLiveTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const PlayingIcon = () => (
  <motion.div
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
  >
    <Radio size={28} className="text-white" />
  </motion.div>
);

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [queue, setQueue] = useState([]);
  const [showAdBlockerWarning, setShowAdBlockerWarning] = useState(false);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [popularGenres, setPopularGenres] = useState([]);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const playerRef = useRef(null);
  const [sliderValue, setSliderValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [playlists, setPlaylists] = useState([]);
  const [showCreatePlaylistDialog, setShowCreatePlaylistDialog] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showQueue, setShowQueue] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [likedVideos, setLikedVideos] = useState([]);
  const [currentView, setCurrentView] = useState('explore');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [selectedNavItem, setSelectedNavItem] = useState('Explore');
  const [playlistToRename, setPlaylistToRename] = useState(null);
  const [showAddToPlaylistDialog, setShowAddToPlaylistDialog] = useState(false);
  const [videoToAddToPlaylist, setVideoToAddToPlaylist] = useState(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [likedTracks, setLikedTracks] = useState([]);
  const [showDeletePlaylistDialog, setShowDeletePlaylistDialog] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState(null);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [miniPlayerHeight, setMiniPlayerHeight] = useState(0);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);
  const [isMobileLibraryOpen, setIsMobileLibraryOpen] = useState(false);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [livePodcasts, setLivePodcasts] = useState([]);
  const [podcastGenres, setPodcastGenres] = useState([]);
  const [podcastResults, setPodcastResults] = useState([]);
  const [isPodcastSearching, setIsPodcastSearching] = useState(false);
  const [selectedPodcastCategory, setSelectedPodcastCategory] = useState(null);
  const [isLiveVideo, setIsLiveVideo] = useState(false);
  const [liveListeningTime, setLiveListeningTime] = useState(0);
  const liveListeningIntervalRef = useRef(null);

  const [trendingMusic, setTrendingMusic] = useState([]);
  const [lastTrendingCacheTime, setLastTrendingCacheTime] = useState(0);

  // Add these to your existing state declarations at the top of the component
  const [showMobileLibrary, setShowMobileLibrary] = useState(false);
  const [mobilePlaylistToEdit, setMobilePlaylistToEdit] = useState(null);

  // Add this new function to handle mobile playlist edit
  const handleMobilePlaylistEdit = (playlist) => {
    setMobilePlaylistToEdit(playlist);
  };

  // Add this new state to track if we should ignore the next click
  const [ignoreNextClick, setIgnoreNextClick] = useState(false);

  // Add this new function to handle clicks on the main content
  const handleContentClick = useCallback(() => {
    if (!ignoreNextClick && showQueue) {
      setShowQueue(false);
    }
    setIgnoreNextClick(false);
  }, [ignoreNextClick, showQueue]);

  const shuffleArray = useCallback((array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }, []);

  // Function to update user data in Firestore
  const updateUserData = async (data) => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        // Merge the new data with existing data
        await setDoc(userDocRef, data, { merge: true });
        console.log("User data updated successfully:", data);
      } catch (error) {
        console.error("Error updating user data:", error);
      }
    }
  };

  const fetchAndCacheExploreData = useCallback(async () => {
    console.log('Checking explore cache...');
    if (exploreCache && isCacheValid(lastExploreCacheTime, 3600000)) {
      console.log('Using cached explore data');
      return exploreCache;
    }

    console.log('Fetching new explore data...');
    try {
      const genres = [
        { name: 'Pop', image: '/genre-images/pop.png' },
        { name: 'Rock', image: '/genre-images/rock.png' },
        { name: 'Hip Hop', image: '/genre-images/hip-hop.png' },
        { name: 'Electronic', image: '/genre-images/electronic.png' },
        { name: 'Classical', image: '/genre-images/classical.png' },
        { name: 'Jazz', image: '/genre-images/jazz.png' }
      ];
      
      // Fetch trending music (actual songs)
      const trendingResponse = await axios.get(`/api/youtube-search?query=${encodeURIComponent('new music releases')}&type=video&videoCategoryId=10`);
      const trendingMusic = trendingResponse.data.items.slice(0, 10); // Get top 10 trending music videos

      exploreCache = {
        popularGenres: genres,
        trendingMusic: trendingMusic
      };

      lastExploreCacheTime = Date.now();
      setLastTrendingCacheTime(Date.now());
      setTrendingMusic(trendingMusic);
      return exploreCache;
    } catch (error) {
      console.error('Error fetching explore data:', error);
      return null;
    }
  }, []);

  const fetchAndCachePodcastData = useCallback(async () => {
    if (podcastCache && isCacheValid(lastPodcastCacheTime, PODCAST_CACHE_INTERVAL)) {
      return podcastCache;
    }

    try {
      const categories = ['News', 'Comedy', 'True Crime', 'Sports', 'Technology', 'Business'];
      const [popularResponse, liveResponse, categoriesResponse] = await Promise.all([
        axios.get(`/api/youtube-search?query=${encodeURIComponent('famous podcasts')}`),
        axios.get(`/api/youtube-search?query=${encodeURIComponent('podcast')}&type=video&eventType=live`),
        axios.get(`/api/youtube-search?query=${encodeURIComponent(categories.join('|') + ' podcasts')}`)
      ]);

      const categoryResults = categories.map((category, index) => ({
        name: category,
        podcasts: categoriesResponse.data.items.slice(index * 4, (index + 1) * 4)
      }));

      podcastCache = {
        popularPodcasts: popularResponse.data.items,
        livePodcasts: liveResponse.data.items,
        categories: categoryResults
      };

      lastPodcastCacheTime = Date.now();
      return podcastCache;
    } catch (error) {
      console.error('Error fetching podcast data:', error);
      return null;
    }
  }, []);

  // Update the refreshCache function
  const refreshCache = useCallback(async () => {
    console.log('Refreshing cache...');
    if (!isCacheValid(lastExploreCacheTime, 3600000)) { // 1 hour for explore data
      await fetchAndCacheExploreData();
    }
    if (!isCacheValid(lastPodcastCacheTime, PODCAST_CACHE_INTERVAL)) {
      await fetchAndCachePodcastData();
    }
  }, [fetchAndCacheExploreData, fetchAndCachePodcastData]);

  // Add this new function near the top of your component
  const loadCachedData = () => {
    if (exploreCache && isCacheValid(lastExploreCacheTime, 3600000)) {
      setPopularGenres(exploreCache.popularGenres);
      return true;
    }
    return false;
  };

  const router = useRouter();

  // Update the useEffect for initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // First, try to load cached data
        if (exploreCache && isCacheValid(lastExploreCacheTime, 3600000)) {
          console.log('Using cached explore data on initial load');
          setPopularGenres(exploreCache.popularGenres);
          setIsLoading(false);
        } else {
          console.log('Fetching new explore data on initial load');
          const exploreData = await fetchAndCacheExploreData();
          if (exploreData) {
            setPopularGenres(exploreData.popularGenres);
          }
          setIsLoading(false);
        }

        // Load user data if logged in
        if (user) {
          console.log("User is logged in, fetching data...");
          
          // Check if the user's email is verified
          if (!user.emailVerified) {
            console.log("User's email is not verified, redirecting...");
            router.push('/signup?alert=verify');
            return;
          }

          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            console.log("User document exists, retrieving data...");
            const userData = userDocSnap.data();
            console.log("User data:", userData);
            
            // Update state with user data
            if (userData.recentlyPlayed) setRecentlyPlayed(userData.recentlyPlayed);
            if (userData.queue) setQueue(userData.queue);
            if (userData.likedVideos) {
              setLikedVideos(userData.likedVideos);
              setLikedTracks(userData.likedVideos);
            }
            if (userData.playlists) {
              console.log("Setting playlists:", userData.playlists);
              setPlaylists(userData.playlists);
            }
            if (userData.currentPlayingState) {
              const { video, time } = userData.currentPlayingState;
              setSelectedVideo(video);
              setCurrentTime(time);
              setIsPlaying(false);
            }
          } else {
            console.log("User document doesn't exist, creating new document...");
            const initialData = {
              recentlyPlayed: [],
              queue: [],
              likedVideos: [],
              playlists: [],
              currentPlayingState: null
            };
            await setDoc(userDocRef, initialData);
            console.log("Initial user document created");
          }
        } else {
          // If no user is logged in, reset all state to empty
          setRecentlyPlayed([]);
          setQueue([]);
          setLikedVideos([]);
          setLikedTracks([]);
          setPlaylists([]);
          setSelectedVideo(null);
          setCurrentTime(0);
          setIsPlaying(false);
        }

        // Set initial view to Explore
        setCurrentView('explore');

        // Set up periodic cache refresh
        const refreshInterval = setInterval(refreshCache, PODCAST_CACHE_INTERVAL);
        return () => clearInterval(refreshInterval);
      } catch (error) {
        console.error('Error loading initial data:', error);
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [user, fetchAndCacheExploreData, refreshCache, router]);

  // Update Firestore whenever playlists changes
  useEffect(() => {
    if (user && playlists.length > 0) {
      console.log("Updating playlists in Firestore:", playlists);
      updateUserData({ playlists });
    }
  }, [playlists, user]);

  // Update Firestore whenever queue changes
  useEffect(() => {
    if (user && queue.length > 0) {
      updateUserData({ queue });
    }
  }, [queue, user]);

  // Update Firestore whenever likedVideos changes
  useEffect(() => {
    if (user && likedVideos.length > 0) {
      updateUserData({ likedVideos });
    }
  }, [likedVideos, user]);

  // Update Firestore whenever recentlyPlayed changes
  useEffect(() => {
    if (user && recentlyPlayed.length > 0) {
      updateUserData({ recentlyPlayed });
    }
  }, [recentlyPlayed, user]);

  // Add this new useEffect to save duration periodically
  useEffect(() => {
    if (selectedVideo && currentTime > 0) {
      localStorage.setItem(`streamora_playback_${selectedVideo.id}`, currentTime.toString());
    }
  }, [selectedVideo, currentTime]);

  // Modify the handleVideoSelect function
  const handleVideoSelect = useCallback((video) => {
    if (event.defaultPrevented) return;

    console.log('Video selected:', video);
    setSelectedVideo(video);
    setIsPlaying(true);
    setQueue(prevQueue => {
      const updatedQueue = prevQueue.filter(item => item.id !== video.id);
      if (user) {
        updateUserData({ queue: updatedQueue });
      }
      return updatedQueue;
    });
    setCurrentQueueIndex(0);

    // Set isLiveVideo based on the video object
    const isLive = video.isLive || false; // Ensure it's a boolean
    console.log('Is Live:', isLive);
    setIsLiveVideo(isLive);
    setLiveListeningTime(0);

    // Clear any existing interval
    if (liveListeningIntervalRef.current) {
      clearInterval(liveListeningIntervalRef.current);
    }

    if (isLive) {
      // Start the timer for live videos
      liveListeningIntervalRef.current = setInterval(() => {
        setLiveListeningTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      const savedData = localStorage.getItem(`streamora_playback_${video.id}`);
      if (savedData) {
        const savedTime = parseFloat(savedData);
        setCurrentTime(savedTime);
        setSliderValue((savedTime / duration) * 100);
      } else {
        setCurrentTime(0);
        setSliderValue(0);
      }
    }

    setDuration(0);
    if (playerRef.current) {
      playerRef.current.loadVideoById(video.id);
      playerRef.current.playVideo();
    }
    console.log('Loading video:', video.id, 'Is Live:', isLive);

    setRecentlyPlayed(prevRecentlyPlayed => {
      const updatedRecentlyPlayed = [video, ...prevRecentlyPlayed.filter(item => item.id !== video.id)].slice(0, 10);
      if (user) {
        updateUserData({ recentlyPlayed: updatedRecentlyPlayed });
      }
      return updatedRecentlyPlayed;
    });

    if (user) {
      updateUserData({
        currentPlayingState: { video, isLive }
      });
    }
  }, [duration, user]);

  const toggleLike = useCallback((video) => {
    setLikedVideos(prev => {
      const isLiked = prev.some(v => v.id === video.id);
      let newLikedVideos;
      if (isLiked) {
        newLikedVideos = prev.filter(v => v.id !== video.id);
      } else {
        newLikedVideos = [...prev, video];
      }
      if (user) {
        updateUserData({ likedVideos: newLikedVideos });
      }
      setLikedTracks(newLikedVideos);
      return newLikedVideos;
    });
  }, [user]);

  const handleCreatePlaylist = () => {
    if (!user) {
      setShowLoginAlert(true);
      return;
    }
    setShowCreatePlaylistDialog(true);
  };

  const handleConfirmCreatePlaylist = () => {
    const sanitizedName = sanitizePlaylistName(newPlaylistName.trim());
    if (sanitizedName) {
      const newPlaylist = { id: Date.now().toString(), name: sanitizedName, tracks: [] };
      setPlaylists(prevPlaylists => {
        const updatedPlaylists = [...prevPlaylists, newPlaylist];
        if (user) {
          updateUserData({ playlists: updatedPlaylists });
        }
        return updatedPlaylists;
      });
      setNewPlaylistName('');
      setShowCreatePlaylistDialog(false);
    } else {
      // Show an error message to the user
      alert("Please enter a valid playlist name (1-50 characters, alphanumeric and spaces only).");
    }
  };

  const handleDeletePlaylist = (playlistId) => {
    const playlistToDelete = playlists.find(playlist => playlist.id === playlistId);
    setPlaylistToDelete(playlistToDelete);
    setShowDeletePlaylistDialog(true);
  };

  const confirmDeletePlaylist = () => {
    if (playlistToDelete) {
      setPlaylists(prevPlaylists => {
        const updatedPlaylists = prevPlaylists.filter(playlist => playlist.id !== playlistToDelete.id);
        if (user) {
          updateUserData({ playlists: updatedPlaylists });
        }
        if (selectedPlaylist && selectedPlaylist.id === playlistToDelete.id) {
          setSelectedPlaylist(null);
          setCurrentView('explore');
          setSelectedNavItem('Explore');
        }
        return updatedPlaylists;
      });
      setShowDeletePlaylistDialog(false);
      setPlaylistToDelete(null);
    }
  };

  const handleRenamePlaylist = (playlist) => {
    setPlaylistToRename(playlist);
    setNewPlaylistName(playlist.name);
  };

  const confirmRenamePlaylist = () => {
    if (playlistToRename && newPlaylistName.trim()) {
      setPlaylists(prevPlaylists => {
        const updatedPlaylists = prevPlaylists.map(p => 
          p.id === playlistToRename.id ? { ...p, name: newPlaylistName.trim() } : p
        );
        if (user) {
          updateUserData({ playlists: updatedPlaylists });
        }
        if (selectedPlaylist && selectedPlaylist.id === playlistToRename.id) {
          setSelectedPlaylist({ ...selectedPlaylist, name: newPlaylistName.trim() });
        }
        return updatedPlaylists;
      });
      setPlaylistToRename(null);
      setNewPlaylistName('');
    }
  };

  const handleAddToPlaylist = useCallback((playlistId) => {
    if (!videoToAddToPlaylist) return;

    setPlaylists(prevPlaylists => {
      const updatedPlaylists = prevPlaylists.map(playlist => {
        if (playlist.id === playlistId) {
          // Check if the video is already in the playlist
          const isVideoInPlaylist = playlist.tracks.some(track => track.id === videoToAddToPlaylist.id);
          if (!isVideoInPlaylist) {
            return {
              ...playlist,
              tracks: [...playlist.tracks, videoToAddToPlaylist]
            };
          }
        }
        return playlist;
      });

      if (user) {
        updateUserData({ playlists: updatedPlaylists });
      }
      return updatedPlaylists;
    });

    setShowAddToPlaylistDialog(false);
    setVideoToAddToPlaylist(null);
  }, [videoToAddToPlaylist, user]);

  const fetchYouTubeResults = useCallback(async (query, isPodcast = false) => {
    const searchingState = isPodcast ? setIsPodcastSearching : setIsSearching;
    searchingState(true);
    try {
      let searchQuery = query;
      if (isPodcast) {
        searchQuery += ' Podcast';
      }
      const response = await axios.get(`/api/youtube-search?query=${encodeURIComponent(searchQuery)}`);
      if (response.data && response.data.items) {
        if (isPodcast) {
          setPodcastResults(response.data.items);
        } else {
          setSearchResults(response.data.items);
        }
      } else {
        if (isPodcast) {
          setPodcastResults([]);
        } else {
          setSearchResults([]);
        }
      }
    } catch (error) {
      console.error('Error fetching YouTube results:', error);
      if (isPodcast) {
        setPodcastResults([]);
      } else {
        setSearchResults([]);
      }
    }
    searchingState(false);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        if (currentView === 'podcasts') {
          setSelectedPodcastCategory(null);
          fetchYouTubeResults(searchQuery + ' podcast', true);
        } else {
          fetchYouTubeResults(searchQuery);
        }
      } else {
        if (currentView === 'podcasts') {
          setSelectedPodcastCategory(null);
          fetchYouTubeResults('popular podcasts', true);
        } else {
          setSearchResults([]);
        }
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, fetchYouTubeResults, currentView]);

  useEffect(() => {
    if (playerRef.current && duration > 0) {
      const interval = setInterval(() => {
        const currentTime = playerRef.current.getCurrentTime();
        setCurrentTime(currentTime);
        setSliderValue((currentTime / duration) * 100);
      }, 1000 / 60); // Update 60 times per second for smooth movement
      return () => clearInterval(interval);
    }
  }, [playerRef, duration]);

  const handleClosePlayer = useCallback(() => {
    setSelectedVideo(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSliderValue(0);
    setShowQueue(false); // Close the queue card
    setIsLiveVideo(false);
    setLiveListeningTime(0);
    if (liveListeningIntervalRef.current) {
      clearInterval(liveListeningIntervalRef.current);
    }
    if (playerRef.current) {
      playerRef.current.stopVideo();
    }
    if (user) {
      updateUserData({ currentPlayingState: null });
    }
  }, [user]);

  // Update the playNextInQueue function
  const playNextInQueue = useCallback(() => {
    if (queue.length > 0) {
      let nextIndex = (currentQueueIndex + 1) % queue.length;
      const nextVideo = queue[nextIndex];
      handleVideoSelect(nextVideo);
      setCurrentQueueIndex(nextIndex);
    } else {
      handleClosePlayer();
    }
  }, [queue, currentQueueIndex, handleVideoSelect, handleClosePlayer]);

  // Add this new function to remove duplicates from the queue
  const removeDuplicatesFromQueue = useCallback(() => {
    const uniqueQueue = queue.filter((video, index, self) =>
      index === self.findIndex((t) => t.id === video.id)
    );
    setQueue(uniqueQueue);
    if (user) {
      updateUserData({ queue: uniqueQueue });
    }
  }, [queue, user]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (playerRef.current) {
      isPlaying ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
    }
  };

  const handleSkip = (direction) => {
    if (direction === 'forward') {
      playNextInQueue();
    } else if (direction === 'backward') {
      if (currentTime > 3) {
        setCurrentTime(0);
        setSliderValue(0);
        if (playerRef.current) {
          playerRef.current.seekTo(0);
        }
      } else if (currentQueueIndex > 0) {
        const previousVideo = queue[currentQueueIndex - 1];
        handleVideoSelect(previousVideo);
        setCurrentQueueIndex(prevIndex => prevIndex - 1);
      } else {
        setCurrentTime(0);
        setSliderValue(0);
        if (playerRef.current) {
          playerRef.current.seekTo(0);
        }
      }
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
    }
  };

  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX size={20} className="text-white" />;
    if (volume < 33) return <Volume size={20} className="text-white" />;
    if (volume < 67) return <Volume1 size={20} className="text-white" />;
    return <Volume2 size={20} className="text-white" />;
  };

  const handleSliderChange = (newValue) => {
    const newTime = (newValue[0] / 100) * duration;
    setCurrentTime(newTime);
    setSliderValue(newValue[0]);
    if (playerRef.current) {
      playerRef.current.seekTo(newTime);
    }
  };

  const handleLogout = async () => {
    if (playlists.length > 0) {
      setShowLogoutAlert(true);
    } else {
      await performLogout();
    }
  };

  const performLogout = async () => {
    try {
      await doSignOut();
      // Clear all state
      setQueue([]);
      setRecentlyPlayed([]);
      setLikedVideos([]);
      setPlaylists([]);
      setSelectedVideo(null);
      // Reload the entire page after successful logout
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handlePlayerError = (error) => {
    console.error('YouTube player error:', error);
    // Implement error handling, e.g., showing an error message to the user
  };

  useEffect(() => {
    const loadYouTubeAPI = () => {
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
    };

    loadYouTubeAPI();
  }, []);

  const handleNavClick = (label) => {
    setSelectedNavItem(label);
    if (label === 'Explore') {
      setCurrentView('explore');
      setSelectedPlaylist(null);
      setSelectedGenre(null);
      setSelectedMood(null);
      setSearchResults([]);
      setSearchQuery('');
    } else if (label === 'Liked Tracks') {
      if (user) {
        setCurrentView('likedTracks');
        setSelectedPlaylist(null);
      } else {
        setShowLoginAlert(true);
      }
    } else if (label === 'Podcasts') {
      setCurrentView('podcasts');
      fetchYouTubeResults('popular podcasts', true);
    } else if (!user && (label === 'Your Playlists' || label === 'Create Playlist')) {
      setShowLoginAlert(true);
    } else if (label === 'Create Playlist') {
      setShowCreatePlaylistDialog(true);
    }
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleContextMenuAction = (action, video) => {
    if (!user) {
      setShowLoginAlert(true);
      return;
    }

    switch (action) {
      case 'playNext':
        setQueue(prevQueue => {
          const newQueue = [
            ...prevQueue.slice(0, currentQueueIndex + 1),
            video,
            ...prevQueue.slice(currentQueueIndex + 1)
          ];
          if (!selectedVideo) {
            handleVideoSelect(video);
          }
          if (user) {
            updateUserData({ queue: newQueue });
          }
          return newQueue;
        });
        break;
      case 'addToQueue':
        setQueue(prevQueue => {
          if (!prevQueue.some(item => item.id === video.id)) {
            const updatedQueue = [...prevQueue, video];
            if (!selectedVideo) {
              handleVideoSelect(video);
            }
            if (user) {
              updateUserData({ queue: updatedQueue });
            }
            return updatedQueue;
          }
          return prevQueue;
        });
        break;
      case 'addToPlaylist':
        setVideoToAddToPlaylist(video);
        setShowAddToPlaylistDialog(true);
        break;
      case 'saveToLibrary':
        handleSaveToLibrary(video);
        break;
    }
  };

  const handleQueueClick = (e) => {
    if (!user) {
      setShowLoginAlert(true);
    } else {
      e.stopPropagation(); // Prevent the click from immediately closing the queue
      setShowQueue(!showQueue);
      setIgnoreNextClick(true); // Set this to true to ignore the next click
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceId = result.source.droppableId;
    const destinationId = result.destination.droppableId;

    if (sourceId.startsWith('playlist-')) {
      handlePlaylistTrackReorder(sourceId.split('-')[1], result);
    } else if (sourceId === 'queue') {
      const items = Array.from(queue);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      setQueue(items);
      if (user) {
        updateUserData({ queue: items });
      }
    }
  };

  const removeFromQueue = (index) => {
    setQueue(prevQueue => {
      const newQueue = [...prevQueue];
      newQueue.splice(index, 1);
      if (user) {
        updateUserData({ queue: newQueue });
      }
      // Adjust currentQueueIndex if necessary
      if (index < currentQueueIndex) {
        setCurrentQueueIndex(prevIndex => prevIndex - 1);
      }
      return newQueue;
    });
  };

  // Update the clearQueue function
  const clearQueue = () => {
    setQueue([]);
    setCurrentQueueIndex(0);
    if (user) {
      updateUserData({ queue: [] });
    }
  };

  const playNext = useCallback(() => {
    playNextInQueue();
  }, [playNextInQueue]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.addEventListener('onStateChange', (event) => {
        if (event.data === window.YT.PlayerState.ENDED) {
          playNext();
        }
      });
    }
  }, [playerRef, playNext]);

  // Update the handleRemoveFromRecents function
  const handleRemoveFromRecents = useCallback((event, videoId) => {
    event.preventDefault();
    event.stopPropagation();
    setRecentlyPlayed(prevRecents => {
      const updatedRecents = prevRecents.filter(video => video.id !== videoId);
      if (user) {
        updateUserData({ recentlyPlayed: updatedRecents });
      }
      return updatedRecents;
    });
    // Ensure that the video is not played after removal
    if (selectedVideo && selectedVideo.id === videoId) {
      handleClosePlayer();
    }
  }, [user, updateUserData, selectedVideo, handleClosePlayer]);

  const isVideoLiked = useCallback((videoId) => {
    return likedVideos.some(v => v.id === videoId);
  }, [likedVideos]);

  const renderVideoCard = (result, index, isRecentlyPlayed = false) => (
    <ContextMenu key={result.id}>
      <ContextMenuTrigger>
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          whileHover={{ scale: 1.03 }}
          className="bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group relative w-full h-[300px] md:h-[300px] flex flex-col"
        >
          <div onClick={(e) => {
            if (!e.defaultPrevented) {
              handleVideoSelect(result);
            }
          }} className="relative aspect-video h-[180px]">
            <Image 
              src={result.thumbnail} 
              alt={result.title} 
              layout="fill"
              objectFit="cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
              <Play fill="white" size={36} className="opacity-0 group-hover:opacity-100 transition-all duration-300" />
            </div>
            {result.isLive && (
              <span className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">LIVE</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLike(result);
              }}
              className="absolute top-2 right-2 z-10 bg-black bg-opacity-50 p-1.5 rounded-full"
            >
              <Heart
                fill={isVideoLiked(result.id) ? "white" : "none"}
                stroke="white"
                size={18}
              />
            </button>
            {/* Add three-dot menu for mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-2 left-2 z-10 bg-black bg-opacity-50 p-1.5 rounded-full md:hidden"
                >
                  <MoreVertical size={18} color="white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-gray-800 border border-gray-700">
                <DropdownMenuItem 
                  className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    handleContextMenuAction('playNext', result);
                  }}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Play Next
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    handleContextMenuAction('addToQueue', result);
                  }}
                >
                  <List className="mr-2 h-4 w-4" />
                  Add to Queue
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    handleContextMenuAction('addToPlaylist', result);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Playlist
                </DropdownMenuItem>
                {isRecentlyPlayed && (
                  <DropdownMenuItem 
                    className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveFromRecents(e, result.id);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remove from Recents
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="p-4 flex-grow flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-sm mb-2 text-white line-clamp-2 h-10">{result.title}</h3>
              <p className="text-xs text-gray-400 mb-2">{result.channelName}</p>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>{result.views}</span>
              {result.uploadedAt !== 'N/A' && <span>{result.uploadedAt}</span>}
            </div>
          </div>
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56 bg-gray-800 border border-gray-700 hidden md:block">
        <ContextMenuItem 
          className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
          onSelect={() => handleContextMenuAction('playNext', result)}
        >
          <Play className="mr-2 h-4 w-4" />
          Play Next
        </ContextMenuItem>
        <ContextMenuItem 
          className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
          onSelect={() => handleContextMenuAction('addToQueue', result)}
        >
          <List className="mr-2 h-4 w-4" />
          Add to Queue
        </ContextMenuItem>
        <ContextMenuItem 
          className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
          onSelect={() => handleContextMenuAction('addToPlaylist', result)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add to Playlist
        </ContextMenuItem>
        {isRecentlyPlayed && (
          <ContextMenuItem 
            className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRemoveFromRecents(e, result.id);
            }}
          >
            <X className="mr-2 h-4 w-4" />
            Remove from Recents
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );

  const renderVideoListItem = (result, index, isRecentlyPlayed = false) => (
    <motion.div
      key={result.id}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      className="bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group relative w-full flex mb-4"
      onClick={(e) => {
        if (!e.defaultPrevented) {
          handleVideoSelect(result);
        }
      }}
    >
      <div className="relative w-40 h-24 flex-shrink-0">
        <Image 
          src={result.thumbnail} 
          alt={result.title} 
          layout="fill"
          objectFit="cover"
        />
        {result.isLive && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">LIVE</span>
        )}
      </div>
      <div className="flex-1 p-3 flex flex-col justify-between pr-16">
        <div>
          <h3 className="font-semibold text-sm mb-1 text-white line-clamp-2">{result.title}</h3>
          <p className="text-xs text-gray-400">{result.channelName}</p>
        </div>
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>{result.views}</span>
          {result.uploadedAt !== 'N/A' && <span>{result.uploadedAt}</span>}
        </div>
      </div>
      <div className="absolute top-2 right-2 flex flex-col space-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-700 text-white p-1.5 rounded-full hover:bg-gray-600 transition-colors"
            >
              <MoreVertical size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-gray-800 border border-gray-700">
            <DropdownMenuItem 
              className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
              onSelect={() => handleContextMenuAction('playNext', result)}
            >
              <Play className="mr-2 h-4 w-4" />
              Play Next
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
              onSelect={() => handleContextMenuAction('addToQueue', result)}
            >
              <List className="mr-2 h-4 w-4" />
              Add to Queue
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
              onSelect={() => handleContextMenuAction('addToPlaylist', result)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add to Playlist
            </DropdownMenuItem>
            {isRecentlyPlayed && (
              <DropdownMenuItem 
                className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemoveFromRecents(e, result.id);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Remove from Recents
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(result);
          }}
          className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
        >
          <Heart size={14} fill={isVideoLiked(result.id) ? "white" : "none"} />
        </button>
      </div>
    </motion.div>
  );

  const handlePlaylistClick = (playlist) => {
    setSelectedPlaylist(playlist);
    setCurrentView('playlist');
    setSelectedNavItem(`playlist-${playlist.id}`);
  };

  const ListItem = React.forwardRef(({ className, title, children, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <a
            ref={ref}
            className={cn(
              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
              className
            )}
            {...props}
          >
            <div className="text-sm font-medium leading-none">{title}</div>
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
              {children}
            </p>
          </a>
        </NavigationMenuLink>
      </li>
    )
  })
  ListItem.displayName = "ListItem"

  const handlePlayPlaylist = (playlist) => {
    if (playlist.tracks.length > 0) {
      const tracksToPlay = isShuffleOn ? shuffleArray([...playlist.tracks]) : playlist.tracks;
      setQueue(tracksToPlay);
      handleVideoSelect(tracksToPlay[0]);
    }
  };

  const toggleShuffle = () => {
    setIsShuffleOn(!isShuffleOn);
  };

  const handlePlaylistTrackReorder = useCallback((playlistId, result) => {
    if (!result.destination) return;

    setPlaylists(prevPlaylists => {
      const updatedPlaylists = prevPlaylists.map(playlist => {
        if (playlist.id === playlistId) {
          const newTracks = Array.from(playlist.tracks);
          const [reorderedItem] = newTracks.splice(result.source.index, 1);
          newTracks.splice(result.destination.index, 0, reorderedItem);
          return { ...playlist, tracks: newTracks };
        }
        return playlist;
      });

      if (selectedPlaylist && selectedPlaylist.id === playlistId) {
        const updatedSelectedPlaylist = updatedPlaylists.find(p => p.id === playlistId);
        setSelectedPlaylist(updatedSelectedPlaylist);
      }

      if (user) {
        updateUserData({ playlists: updatedPlaylists });
      }

      return updatedPlaylists;
    });
  }, [user, selectedPlaylist, updateUserData]);

  const renderPlaylistView = () => {
    if (!selectedPlaylist) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mb-12"
      >
        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-1">Playlist</p>
          <h2 className="text-4xl font-bold text-white">{selectedPlaylist.name}</h2>
        </div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => handlePlayPlaylist(selectedPlaylist)}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Play className="mr-2 h-4 w-4" /> Play
            </Button>
            <Button
              onClick={toggleShuffle}
              className={`${isShuffleOn ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
            >
              <Shuffle className="mr-2 h-4 w-4" /> Shuffle
            </Button>
          </div>
        </div>
        {selectedPlaylist.tracks.length > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId={`playlist-${selectedPlaylist.id}`}>
              {(provided) => (
                <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {selectedPlaylist.tracks.map((track, index) => (
                    <Draggable key={index} draggableId={`${selectedPlaylist.id}-${index}`} index={index}>
                      {(provided, snapshot) => (
                        <li
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-gray-800 p-3 rounded-lg flex items-center space-x-3 hover:bg-gray-700 transition-colors ${
                            snapshot.isDragging ? 'shadow-lg' : ''
                          }`}
                          style={{
                            ...provided.draggableProps.style,
                            transform: snapshot.isDragging
                              ? `${provided.draggableProps.style.transform} rotate(3deg)`
                              : provided.draggableProps.style.transform,
                          }}
                        >
                          <div 
                            {...provided.dragHandleProps}
                            className="flex-shrink-0 mr-2 text-gray-400 cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical size={20} />
                          </div>
                          <div className="flex-shrink-0 w-12 h-12 relative">
                            <Image
                              src={track.thumbnail}
                              alt={track.title}
                              layout="fill"
                              objectFit="cover"
                              className="rounded"
                            />
                          </div>
                          <div className="flex-grow min-w-0">
                            <p className="font-medium text-white truncate">{track.title}</p>
                            <p className="text-sm text-gray-400 truncate">{track.channelName}</p>
                          </div>
                          <div className="flex-shrink-0 flex items-center space-x-2">
                            <button
                              onClick={() => handleVideoSelect(track)}
                              className="text-white hover:text-green-500 transition-colors p-2"
                            >
                              <Play size={20} />
                            </button>
                            <button
                              onClick={() => toggleLike(track)}
                              className="text-white hover:text-red-500 transition-colors p-2"
                            >
                              <Heart
                                fill={isVideoLiked(track.id) ? "currentColor" : "none"}
                                size={20}
                              />
                            </button>
                          </div>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <p className="text-gray-400">This playlist is empty. Add some tracks!</p>
        )}
      </motion.div>
    );
  };

  const renderLikedTracksView = () => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mb-12"
      >
        <h1 className="text-3xl font-bold text-white mb-6">Liked Tracks</h1>
        {likedTracks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {likedTracks.map((track, index) => renderVideoCard(track, index, false))}
          </div>
        ) : (
          <p className="text-gray-400">You haven't liked any tracks yet. Start exploring and like some tracks!</p>
        )}
      </motion.div>
    );
  };

  const renderMainContent = () => {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 md:space-y-8"
        onClick={handleContentClick}
      >
        {/* Header with search bar and user info */}
        {currentView !== 'likedTracks' && (
          <motion.header
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 120 }}
            className="flex justify-between items-center mb-6 md:mb-12 gap-4"
          >
            <div className="flex-grow max-w-md">
              <motion.div 
                className={`
                  flex items-center 
                  bg-gradient-to-r from-gray-800 to-gray-700
                  rounded-full 
                  transition-all duration-300 ease-in-out
                  ${isSearchFocused ? 'ring-2 ring-blue-400 shadow-lg' : 'shadow-md'}
                  ${isSearchFocused ? 'pl-4 pr-3 py-2 md:pl-6 md:pr-4 md:py-4' : 'pl-3 pr-2 py-2 md:pl-4 md:pr-3 md:py-3'}
                `}
                animate={{ 
                  scale: isSearchFocused ? 1.02 : 1,
                  boxShadow: isSearchFocused ? '0 4px 6px rgba(0, 0, 0, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
                whileHover={{ scale: 1.01 }}
              >
                <Search 
                  className={`
                    text-gray-400 
                    transition-all duration-300
                    ${isSearchFocused ? 'text-blue-400 w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3' : 'w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2'}
                  `}
                />
                <input 
                  className="
                    w-full bg-transparent text-white 
                    border-none focus:outline-none focus:ring-0
                    placeholder-gray-400 text-xs md:text-sm
                  "
                  placeholder={currentView === 'podcasts' ? "Search for podcasts" : "Search for YouTube videos"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                />
              </motion.div>
            </div>
            
            {/* User info and login/signup buttons */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-white font-semibold hover:text-gray-300 transition-colors duration-200 flex items-center cursor-pointer text-xs sm:text-sm">
                      {user.displayName}
                      <MoreVertical size={16} className="ml-1 sm:ml-2" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48 bg-gray-800 border border-gray-700">
                    <DropdownMenuItem 
                      className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
                      onSelect={() => {
                        window.open('/you', '_blank');
                      }}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
                      onSelect={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link href="/login" className="text-xs sm:text-sm text-white hover:text-gray-300 transition-colors duration-200" target="_blank" rel="noopener noreferrer">
                    Sign In
                  </Link>
                  <div className="h-4 w-px bg-white hidden sm:block"></div>
                  <Link href="/signup" className="text-xs sm:text-sm text-white hover:text-gray-300 transition-colors duration-200" target="_blank" rel="noopener noreferrer">
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </motion.header>
        )}

        {/* Render appropriate content based on currentView */}
        {currentView === 'likedTracks' && renderLikedTracksView()}
        {currentView === 'playlist' && selectedPlaylist && renderPlaylistView()}
        {currentView === 'podcasts' && renderPodcastView()}
        {currentView === 'explore' && (
          <>
            {searchQuery || selectedGenre || selectedMood ? (
              // Search Results Section
              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-4">
                  {selectedGenre ? `${selectedGenre} Music` : 
                   selectedMood ? `${selectedMood} Music` : 
                   'Search Results'}
                </h2>
                {isSearching ? (
                  <div className="flex justify-center items-center h-32">
                    <ClientOnlyWobble size="45" speed="1.75" color="white" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 hidden">
                    {searchResults.map((result, index) => renderVideoCard(result, index))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400">
                    {selectedGenre 
                      ? `No results found for "${selectedGenre} Music"`
                      : selectedMood
                      ? `No results found for "${selectedMood} Music"`
                      : `No results found for "${searchQuery}"`
                    }
                  </p>
                )}
                {/* Mobile list view for search results */}
                <div className="md:hidden">
                  {searchResults.map((result, index) => renderVideoListItem(result, index))}
                </div>
              </section>
            ) : (
              // Home/Explore Content
              <>
                {/* Hero Section */}
                <section className="relative h-40 md:h-64 rounded-lg overflow-hidden mb-6 md:mb-8">
                  <Image
                    src="/discover.jpg"
                    alt="Discover podcasts"
                    layout="fill"
                    objectFit="cover"
                    className="brightness-50"
                  />
                  <div className="absolute inset-0 flex flex-col justify-center items-start p-4 md:p-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Listen to any Podcast</h1>
                    <p className="text-sm md:text-xl text-gray-200 mb-4">Discover, stream, and enjoy a world of podcasts</p>
                    <Button 
                      className="bg-white text-black hover:bg-gray-200 text-sm md:text-base"
                      onClick={() => {
                        handlePodcastNavClick();
                        setCurrentView('podcasts');
                        setSelectedNavItem('Podcasts');
                      }}
                    >
                      Explore Podcasts
                    </Button>
                  </div>
                </section>

                {/* Recently Played Section */}
                {recentlyPlayed.length > 0 && (
                  <section>
                    <h2 className="text-xl md:text-2xl font-bold mb-4">Recently Played</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                      {recentlyPlayed.slice(0, 5).map((video, index) => renderVideoCard(video, index, true))}
                    </div>
                  </section>
                )}

                {/* Popular Genres */}
                <section>
                  <h2 className="text-xl md:text-2xl font-bold mb-4">Popular Genres</h2>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
                    {popularGenres.map((genre) => (
                      <div
                        key={genre.name}
                        className="relative h-24 md:h-40 rounded-lg overflow-hidden cursor-pointer group"
                        onClick={() => handleGenreClick(genre.name)}
                      >
                        <Image
                          src={genre.image}
                          alt={genre.name}
                          layout="fill"
                          objectFit="cover"
                          className="group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                          <h3 className="text-sm md:text-xl font-bold text-white">{genre.name}</h3>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Trending Now */}
                <section>
                  <h2 className="text-xl md:text-2xl font-bold mb-4">Trending Now</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                    {trendingMusic.slice(0, 10).map((video, index) => renderVideoCard(video, index, false))}
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 z-30">
          <div className="flex justify-around items-center p-2">
            <button
              onClick={() => handleNavClick('Explore')}
              className={`flex flex-col items-center p-2 ${
                selectedNavItem === 'Explore' ? 'text-white' : 'text-gray-400'
              }`}
            >
              <Compass size={24} />
              <span className="text-xs mt-1">Explore</span>
            </button>
            <button
              onClick={() => handlePodcastNavClick()}
              className={`flex flex-col items-center p-2 ${
                selectedNavItem === 'Podcasts' ? 'text-white' : 'text-gray-400'
              }`}
            >
              <Radio size={24} />
              <span className="text-xs mt-1">Podcasts</span>
            </button>
            <button
              onClick={() => handleNavClick('Liked Tracks')}
              className={`flex flex-col items-center p-2 ${
                selectedNavItem === 'Liked Tracks' ? 'text-white' : 'text-gray-400'
              }`}
            >
              <Heart size={24} />
              <span className="text-xs mt-1">Liked</span>
            </button>
            <button
              onClick={() => setShowMobileLibrary(true)}
              className={`flex flex-col items-center p-2 ${
                isMobileLibraryOpen ? 'text-white' : 'text-gray-400'
              }`}
            >
              <Library size={24} />
              <span className="text-xs mt-1">Library</span>
            </button>
          </div>
        </div>

        {/* Mobile Library AlertDialog */}
        <AlertDialog open={showMobileLibrary} onOpenChange={setShowMobileLibrary}>
          <AlertDialogContent className="bg-gray-900 border border-gray-800 text-white max-w-[95vw] p-4 max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-bold">Your Library</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-gray-400">
                Manage your playlists
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-2">
              <Button
                onClick={() => {
                  setShowMobileLibrary(false);
                  setShowCreatePlaylistDialog(true);
                }}
                className="w-full mb-2 bg-blue-600 text-white hover:bg-blue-700 text-sm py-2"
              >
                <PlusCircle className="mr-2" size={14} />
                Create New Playlist
              </Button>
              <ScrollArea className="h-[50vh]">
                {playlists.map((playlist) => (
                  <div key={playlist.id} className="flex items-center justify-between mb-2 p-2 bg-gray-800 rounded">
                    <button
                      className="flex-grow text-left text-white hover:text-gray-300 text-sm"
                      onClick={() => {
                        handlePlaylistClick(playlist);
                        setShowMobileLibrary(false);
                      }}
                    >
                      {playlist.name}
                    </button>
                    <button
                      onClick={() => handleMobilePlaylistEdit(playlist)}
                      className="ml-2 p-1 text-gray-400 hover:text-white"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                ))}
              </ScrollArea>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-800 text-white hover:bg-gray-700 text-sm py-2">
                Close
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Mobile Playlist Edit AlertDialog */}
        <AlertDialog open={!!mobilePlaylistToEdit} onOpenChange={() => setMobilePlaylistToEdit(null)}>
          <AlertDialogContent className="bg-gray-900 border border-gray-800 text-white max-w-[95vw] p-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-bold">Edit Playlist</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-gray-400">
                Rename or delete the playlist
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-2 space-y-2">
              <Button
                onClick={() => {
                  handleRenamePlaylist(mobilePlaylistToEdit);
                  setMobilePlaylistToEdit(null);
                }}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 text-sm py-2"
              >
                Rename Playlist
              </Button>
              <Button
                onClick={() => {
                  handleDeletePlaylist(mobilePlaylistToEdit.id);
                  setMobilePlaylistToEdit(null);
                }}
                className="w-full bg-red-600 text-white hover:bg-red-700 text-sm py-2"
              >
                Delete Playlist
              </Button>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-800 text-white hover:bg-gray-700 text-sm py-2">
                Cancel
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AnimatePresence>
          {isMobileLibraryOpen && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-x-0 bottom-14 h-[calc(100%-3.5rem)] bg-gray-900 p-6 z-40 md:hidden overflow-y-auto"
            >
              <button onClick={() => setIsMobileLibraryOpen(false)} className="absolute top-4 right-4 text-white">
                <X size={24} />
              </button>
              <div className="mt-12">
                <nav className="space-y-4">
                  {renderNavItem('Explore', <Compass size={20} className="mr-2" />, 'Explore')}
                  {renderNavItem('Podcasts', <Radio size={20} className="mr-2" />, 'Podcasts')}
                  {renderNavItem('Liked Tracks', <Heart size={20} className="mr-2" />, 'Liked Tracks')}
                  {user && (
                    <>
                      {renderNavItem('Playlists', <List size={20} className="mr-2" />, 'Playlists')}
                      {renderNavItem('Albums', <Music size={20} className="mr-2" />, 'Albums')}
                      {renderNavItem('Artists', <User size={20} className="mr-2" />, 'Artists')}
                    </>
                  )}
                </nav>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const handleGenreClick = useCallback(async (genre) => {
    setSelectedGenre(genre);
    setSelectedMood(null);
    setIsSearching(true);
    
    try {
      const response = await axios.get(`/api/youtube-search?query=${encodeURIComponent(genre + ' music')}`);
      if (response.data && response.data.items) {
        setSearchResults(response.data.items);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error fetching YouTube results:', error);
      setSearchResults([]);
    }
    setIsSearching(false);
  }, []);

  const handleMoodClick = useCallback(async (mood) => {
    setSelectedMood(mood);
    setSelectedGenre(null);
    setIsSearching(true);
    try {
      const response = await axios.get(`/api/youtube-search?query=${encodeURIComponent(mood + ' music')}`);
      if (response.data && response.data.items) {
        setSearchResults(response.data.items);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error fetching YouTube results:', error);
      setSearchResults([]);
    }
    setIsSearching(false);
  }, []);

  const handlePodcastNavClick = useCallback(async () => {
    setCurrentView('podcasts');
    setSelectedNavItem('Podcasts');
    setIsPodcastSearching(true);
    
    try {
      const podcastData = await fetchAndCachePodcastData();
      if (podcastData) {
        setPodcastResults(podcastData.popularPodcasts);
        setLivePodcasts(podcastData.livePodcasts);
        setPodcastGenres(podcastData.categories);
      }
    } catch (error) {
      console.error('Error fetching podcast data:', error);
      setPodcastResults([]);
      setLivePodcasts([]);
      setPodcastGenres([]);
    }
    
    setIsPodcastSearching(false);
  }, [fetchAndCachePodcastData]);

  const renderPodcastView = () => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mb-12"
      >
        {searchQuery || selectedPodcastCategory ? (
          // Search Results Section
          <section>
            <h2 className="text-xl md:text-2xl font-bold mb-4">
              {selectedPodcastCategory ? `${selectedPodcastCategory} Podcasts` : 'Search Results'}
            </h2>
            {isPodcastSearching ? (
              <div className="flex justify-center items-center h-32">
                <ClientOnlyWobble size="45" speed="1.75" color="white" />
              </div>
            ) : podcastResults.length > 0 ? (
              <>
                {/* Desktop grid view */}
                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {podcastResults.map((podcast) => renderVideoCard(podcast, podcast.id, false))}
                </div>
                {/* Mobile list view */}
                <div className="md:hidden">
                  {podcastResults.map((podcast) => renderVideoListItem(podcast, podcast.id, false))}
                </div>
              </>
            ) : (
              <p className="text-center text-gray-400">
                {selectedPodcastCategory 
                  ? `No results found for "${selectedPodcastCategory} Podcasts"`
                  : `No results found for "${searchQuery}"`
                }
              </p>
            )}
          </section>
        ) : (
          // Podcast Explore Content
          <>
            {/* Popular Live Podcasts Section */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">Popular Live Podcasts</h3>
              {isPodcastSearching ? (
                <div className="flex justify-center items-center h-32">
                  <ClientOnlyWobble size="45" speed="1.75" color="white" />
                </div>
              ) : livePodcasts.length > 0 ? (
                <>
                  {/* Desktop grid view */}
                  <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {livePodcasts.slice(0, 3).map((podcast) => (
                      renderVideoCard({...podcast, isLive: true}, podcast.id)
                    ))}
                  </div>
                  {/* Mobile list view */}
                  <div className="md:hidden">
                    {livePodcasts.slice(0, 3).map((podcast) => (
                      renderVideoListItem({...podcast, isLive: true}, podcast.id)
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-400">No popular live podcasts at the moment</p>
              )}
            </section>

            {/* Podcast Categories */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">Popular Categories</h3>
              <div className="flex flex-wrap gap-2">
                {podcastGenres.map((category) => (
                  <button
                    key={category.name}
                    className="flex-grow bg-gray-800 px-4 py-2 rounded-lg text-center cursor-pointer hover:bg-gray-700 transition-colors duration-300"
                    onClick={() => handlePodcastCategoryClick(category.name)}
                  >
                    <span className="text-sm md:text-base font-semibold whitespace-nowrap">{category.name}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Popular Podcasts Section */}
            <section>
              <h3 className="text-xl font-semibold text-white mb-4">Popular Podcasts</h3>
              {isPodcastSearching ? (
                <div className="flex justify-center items-center h-32">
                  <ClientOnlyWobble size="45" speed="1.75" color="white" />
                </div>
              ) : podcastResults.length > 0 ? (
                <>
                  {/* Desktop grid view */}
                  <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {podcastResults.slice(0, 8).map((podcast) => renderVideoCard(podcast, podcast.id, false))}
                  </div>
                  {/* Mobile list view */}
                  <div className="md:hidden">
                    {podcastResults.slice(0, 8).map((podcast) => renderVideoListItem(podcast, podcast.id, false))}
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-400">No podcasts found</p>
              )}
            </section>
          </>
        )}
      </motion.div>
    );
  };

  const handlePodcastCategoryClick = useCallback(async (category) => {
    setSelectedPodcastCategory(category);
    setIsPodcastSearching(true);

    if (podcastCache && podcastCache.categories) {
      const cachedCategory = podcastCache.categories.find(c => c.name === category);
      if (cachedCategory) {
        setPodcastResults(cachedCategory.podcasts);
        setIsPodcastSearching(false);
        return;
      }
    }

    try {
      const response = await axios.get(`/api/youtube-search?query=${encodeURIComponent(category + ' podcasts')}`);
      if (response.data && response.data.items) {
        setPodcastResults(response.data.items);
      } else {
        setPodcastResults([]);
      }
    } catch (error) {
      console.error('Error fetching YouTube results:', error);
      setPodcastResults([]);
    }
    setIsPodcastSearching(false);
  }, []);

  const renderNavItem = (label, icon, navKey) => {
    const isSelected = selectedNavItem === navKey;
    const isDisabled = !user && navKey !== 'Explore' && navKey !== 'Podcasts';
    const buttonClass = `
      flex items-center w-full py-2 px-4 rounded-lg transition-colors duration-200 cursor-pointer
      ${isSelected && !isDisabled ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
      ${isDisabled ? 'opacity-50' : ''}
    `;

    const handleClick = () => {
      if (isDisabled) {
        setShowLoginAlert(true);
      } else {
        if (label === 'Podcasts') {
          handlePodcastNavClick();
        } else {
          handleNavClick(label);
        }
      }
    };

    return (
      <button
        className={buttonClass}
        onClick={handleClick}
      >
        {icon}
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  return (
    <ErrorBoundary>
      <LdrsComponents />
      <AnimatePresence>
        {isLoading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-black flex items-center justify-center z-50"
          >
            <ClientOnlyBouncy size="45" speed="1.75" color="white" />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex h-screen bg-black text-white"
          >
            {/* Sidebar (hidden on mobile) */}
            <motion.aside
              initial={{ x: -100 }}
              animate={{ x: 0 }}
              transition={{ type: 'spring', stiffness: 120 }}
              className="w-64 bg-gray-900 p-6 hidden md:flex flex-col h-full"
            >
              <div className="flex flex-col h-full">
                <h1 className="text-3xl font-bold mb-8 text-white">Streamora</h1>
                
                <nav className="space-y-4">
                  {renderNavItem('Explore', <Compass className="mr-3" size={20} />, 'Explore')}
                  {renderNavItem('Podcasts', <Radio className="mr-3" size={20} />, 'Podcasts')}
                  {renderNavItem('Liked Tracks', <Heart className="mr-3" size={20} />, 'Liked Tracks')}
                  
                  <button
                    className={`flex items-center w-full py-2 px-4 rounded-lg transition-colors duration-200 cursor-pointer ${
                      selectedNavItem.startsWith('playlist-') ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    } ${!user ? 'opacity-50' : ''}`}
                    onClick={() => user ? setIsLibraryOpen(!isLibraryOpen) : setShowLoginAlert(true)}
                  >
                    <Library className="mr-3" size={20} />
                    <span className="font-medium">Your Library</span>
                    <ChevronDown className={`ml-auto h-4 w-4 transform transition-transform ${isLibraryOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isLibraryOpen && user && (
                    <div className="ml-6 space-y-2">
                      <button
                        className="flex items-center w-full py-1 px-2 rounded-md text-gray-400 hover:bg-gray-800 hover:text-white transition-colors duration-200 cursor-pointer"
                        onClick={() => handleNavClick('Create Playlist')}
                      >
                        <PlusCircle className="mr-2" size={16} />
                        <span className="text-sm">Create Playlist</span>
                      </button>
                      {playlists.map((playlist) => (
                        <ContextMenu key={playlist.id}>
                          <ContextMenuTrigger>
                            <button
                              className={`flex items-center w-full py-1 px-2 rounded-md transition-colors duration-200 cursor-pointer ${
                                selectedPlaylist && selectedPlaylist.id === playlist.id
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                              }`}
                              onClick={() => handlePlaylistClick(playlist)}
                            >
                              <span className="text-sm truncate">{playlist.name}</span>
                            </button>
                          </ContextMenuTrigger>
                          <ContextMenuContent className="w-48 bg-gray-800 border border-gray-700 cursor-pointer">
                            <ContextMenuItem
                              className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
                              onSelect={() => handleRenamePlaylist(playlist)}
                            >
                              <Edit className="mr-2" size={16} />
                              Rename
                            </ContextMenuItem>
                            <ContextMenuItem
                              className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
                              onSelect={() => handleDeletePlaylist(playlist.id)}
                            >
                              <Trash2 className="mr-2" size={16} />
                              Delete
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      ))}
                    </div>
                  )}
                </nav>
              </div>
            </motion.aside>

            {/* Main content */}
            <main 
              className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 md:pt-8 pt-4 pb-20 md:pb-8"
              style={{ paddingBottom: `${miniPlayerHeight + 60}px` }}
            >
              {renderMainContent()}
            </main>

            {/* Queue Popup */}
            <AnimatePresence>
              {showQueue && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="fixed bottom-24 right-4 bg-gray-800 p-4 rounded-lg shadow-lg w-80 max-h-96 overflow-y-auto z-30"
                  onClick={(e) => e.stopPropagation()} // Add this to prevent clicks inside the queue from closing it
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Queue</h3>
                    <Button
                      onClick={clearQueue}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-gray-700"
                    >
                      <Trash size={16} className="mr-2" />
                      Clear
                    </Button>
                  </div>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="queue">
                      {(provided) => (
                        <ul {...provided.droppableProps} ref={provided.innerRef}>
                          {queue.map((video, index) => (
                            <Draggable key={video.id} draggableId={video.id} index={index}>
                              {(provided, snapshot) => (
                                <li
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`flex items-start justify-between mb-2 bg-gray-700 p-2 rounded ${
                                    snapshot.isDragging ? 'shadow-lg' : ''
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    transform: snapshot.isDragging
                                      ? `${provided.draggableProps.style.transform} rotate(3deg)`
                                      : provided.draggableProps.style.transform,
                                  }}
                                >
                                  <div 
                                    {...provided.dragHandleProps}
                                    className="flex-shrink-0 mr-2 text-gray-400 cursor-grab active:cursor-grabbing"
                                  >
                                    <GripVertical size={16} />
                                  </div>
                                  <div className="flex items-start flex-grow mr-2">
                                    <Image
                                      src={video.thumbnail}
                                      alt={video.title}
                                      width={40}
                                      height={40}
                                      className="rounded mr-2 flex-shrink-0"
                                    />
                                    <span className="text-sm break-words">{video.title}</span>
                                  </div>
                                  <button
                                    onClick={() => removeFromQueue(index)}
                                    className="text-red-500 hover:text-red-700 flex-shrink-0"
                                  >
                                    <X size={16} />
                                  </button>
                                </li>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </ul>
                      )}
                    </Droppable>
                  </DragDropContext>
                </motion.div>
              )}
            </AnimatePresence>

            {/* YouTube Player */}
            <AnimatePresence>
              {selectedVideo && (
                <motion.div
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  exit={{ y: 100 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="fixed bottom-14 md:bottom-0 left-0 w-full bg-gray-900 p-2 sm:p-4 z-20"
                  onLayoutMeasure={(measurement) => setMiniPlayerHeight(measurement.height)}
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-4 mb-2 sm:mb-0 w-full sm:w-auto">
                      <div className="relative w-[71px] h-[40px] sm:w-[106px] sm:h-[60px]">
                        <Image 
                          src={selectedVideo.thumbnail} 
                          alt={selectedVideo.title} 
                          layout="fill"
                          objectFit="cover"
                          className="rounded-md"
                        />
                      </div>
                      <div className="flex-grow sm:flex-grow-0 max-w-[200px] sm:max-w-xs">
                        <h3 className="font-bold text-white text-sm sm:text-base truncate">{selectedVideo.title}</h3>
                        <p className="text-gray-400 text-xs sm:text-sm truncate">{selectedVideo.channelName}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-8">
                      <div className="flex items-center space-x-4 sm:space-x-8">
                        <SkipBack 
                          size={20} 
                          className={`cursor-pointer ${isLiveVideo ? 'text-gray-600' : 'text-gray-400 hover:text-white'} transition-colors sm:w-6 sm:h-6`} 
                          onClick={() => !isLiveVideo && handleSkip('backward')} 
                        />
                        {isLiveVideo ? (
                          <PlayingIcon />
                        ) : isPlaying ? (
                          <Pause size={28} className="cursor-pointer text-white hover:text-gray-300 transition-colors sm:w-8 sm:h-8" onClick={togglePlayPause} />
                        ) : (
                          <Play size={28} className="cursor-pointer text-white hover:text-gray-300 transition-colors sm:w-8 sm:h-8" onClick={togglePlayPause} />
                        )}
                        <SkipForward 
                          size={20} 
                          className={`cursor-pointer ${isLiveVideo ? 'text-gray-600' : 'text-gray-400 hover:text-white'} transition-colors sm:w-6 sm:h-6`} 
                          onClick={() => !isLiveVideo && handleSkip('forward')} 
                        />
                      </div>
                      <div className="flex items-center space-x-4 sm:space-x-6">
                        <button
                          onClick={() => toggleLike(selectedVideo)}
                          className="focus:outline-none"
                        >
                          <Heart
                            fill={isVideoLiked(selectedVideo.id) ? "white" : "none"}
                            stroke="white"
                            size={20}
                            className="transition-all duration-300 sm:w-6 sm:h-6"
                          />
                        </button>
                        <div className="hidden sm:flex items-center space-x-6">
                          <div className="flex items-center space-x-2">
                            {getVolumeIcon()}
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={volume}
                              onChange={handleVolumeChange}
                              className="w-20 accent-white"
                            />
                          </div>
                          <List 
                            size={20} 
                            className="cursor-pointer text-white hover:text-gray-300 transition-colors" 
                            onClick={handleQueueClick}
                          />
                          <X
                            size={20}
                            className="cursor-pointer text-white hover:text-gray-300 transition-colors"
                            onClick={handleClosePlayer}
                          />
                        </div>
                        <div className="sm:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="focus:outline-none">
                                <MoreVertical size={20} className="text-white hover:text-gray-300 transition-colors" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-gray-800 border border-gray-700">
                              <DropdownMenuItem 
                                className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
                                onSelect={handleQueueClick}
                              >
                                <List className="mr-2 h-4 w-4" />
                                Queue
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="flex items-center text-white hover:bg-gray-700 cursor-pointer"
                                onSelect={handleClosePlayer}
                              >
                                <X className="mr-2 h-4 w-4" />
                                Close Player
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    {isLiveVideo ? (
                      <div className="flex justify-between items-center text-xs text-gray-400 mt-1">
                        <span className="text-red-500 font-bold">LIVE</span>
                        <span>Listening for: {formatLiveTime(liveListeningTime)}</span>
                      </div>
                    ) : (
                      <>
                        <Slider
                          value={[sliderValue]}rem
                          max={100}
                          step={0.01}
                          onValueChange={handleSliderChange}
                          className={`w-full ${isLiveVideo ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={isLiveVideo}
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>{formatTime(currentTime)}</span>
                          <span>{duration ? formatTime(duration) : '--:--'}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="h-0 overflow-hidden">
                    <YouTubePlayer
                      videoId={selectedVideo.id}
                      isPlaying={isPlaying}
                      onReady={(event) => {
                        console.log('YouTube player ready');
                        playerRef.current = event.target;
                        const videoDuration = event.target.getDuration();
                        setDuration(isNaN(videoDuration) ? 0 : videoDuration);
                        if (!isLiveVideo) {
                          const savedTime = localStorage.getItem(`streamora_playback_${selectedVideo.id}`);
                          if (savedTime) {
                            event.target.seekTo(parseFloat(savedTime));
                          }
                        }
                        if (isPlaying) {
                          console.log('Playing video');
                          event.target.playVideo();
                        }
                      }}
                      onStateChange={(event) => {
                        console.log('YouTube player state changed:', event.data);
                        setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
                        if (event.data === window.YT.PlayerState.PLAYING) {
                          if (isLiveVideo) {
                            // Start or resume the timer for live videos
                            if (!liveListeningIntervalRef.current) {
                              liveListeningIntervalRef.current = setInterval(() => {
                                setLiveListeningTime(prevTime => prevTime + 1);
                              }, 1000);
                            }
                          } else {
                            const interval = setInterval(() => {
                              const currentTime = event.target.getCurrentTime();
                              setCurrentTime(isNaN(currentTime) ? 0 : currentTime);
                            }, 1000);
                            return () => clearInterval(interval);
                          }
                        } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
                          // Pause the timer for live videos
                          if (isLiveVideo && liveListeningIntervalRef.current) {
                            clearInterval(liveListeningIntervalRef.current);
                            liveListeningIntervalRef.current = null;
                          }
                        }
                      }}
                      onError={handlePlayerError}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showAdBlockerWarning && (
                <motion.div
                  initial={{ y: -100 }}
                  animate={{ y: 0 }}
                  exit={{ y: -100 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="fixed top-0 left-0 right-0 bg-yellow-500 text-black p-2 text-center"
                >
                  Ad-blocker detected. Some features may not work correctly. Please consider disabling it for this site.
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Alert Dialog */}
            <AnimatePresence>
              {showLoginAlert && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                  onClick={() => setShowLoginAlert(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.9 }}
                    className="bg-gray-800 p-4 rounded-lg max-w-[95vw] mx-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h2 className="text-lg font-bold mb-2">You need an account for this.</h2>
                    <p className="mb-4 text-sm">This feature most likely stores data to a database, you will need an account to use it.</p>
                    <div className="flex justify-end space-x-2">
                      <Link href="/login" className="px-3 py-1 bg-white text-black rounded text-sm hover:bg-gray-300 transition-colors" target="_blank" rel="noopener noreferrer">
                        Sign In
                      </Link>
                      <Link href="/signup" className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors" target="_blank" rel="noopener noreferrer">
                        Create an Account
                      </Link>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Create Playlist AlertDialog */}
            <AlertDialog open={showCreatePlaylistDialog} onOpenChange={setShowCreatePlaylistDialog}>
              <AlertDialogContent className="bg-gray-900 border border-gray-800 text-white max-w-[95vw] p-4">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg font-bold">Create New Playlist</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-gray-400">
                    Enter a name for your new playlist (1-50 characters, alphanumeric and spaces only).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  type="text"
                  placeholder="Playlist name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  maxLength={50}
                  className="w-full p-2 mb-2 bg-gray-800 text-white border-gray-700 focus:border-gray-600 focus:ring-gray-600 text-sm"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-gray-800 text-white hover:bg-gray-700 focus:ring-2 focus:ring-gray-400 text-sm py-2">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmCreatePlaylist} className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 text-sm py-2">
                    Create
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Rename Playlist AlertDialog */}
            <AlertDialog open={!!playlistToRename} onOpenChange={() => setPlaylistToRename(null)}>
              <AlertDialogContent className="bg-gray-900 border border-gray-800 text-white max-w-[95vw] p-4">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg font-bold">Rename Playlist</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-gray-400">
                    Enter a new name for your playlist.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  type="text"
                  placeholder="New playlist name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="w-full p-2 mb-2 bg-gray-800 text-white border-gray-700 focus:border-gray-600 focus:ring-gray-600 text-sm"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel 
                    onClick={() => setPlaylistToRename(null)}
                    className="bg-gray-800 text-white hover:bg-gray-700 focus:ring-2 focus:ring-gray-400 text-sm py-2"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={confirmRenamePlaylist}
                    className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 text-sm py-2"
                  >
                    Rename
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Add to Playlist AlertDialog */}
            <AlertDialog open={showAddToPlaylistDialog} onOpenChange={setShowAddToPlaylistDialog}>
              <AlertDialogContent className="bg-gray-900 border border-gray-800 text-white max-w-[95vw] p-4">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg font-bold">Add to Playlist</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-gray-400">
                    Choose a playlist to add the song to:
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <ScrollArea className="max-h-[300px] pr-4">
                  {playlists.length > 0 ? (
                    playlists.map(playlist => (
                      <Button
                        key={playlist.id}
                        onClick={() => handleAddToPlaylist(playlist.id)}
                        className="w-full mb-2 justify-start bg-gray-800 text-white hover:bg-gray-700 text-sm py-2"
                        variant="ghost"
                      >
                        {playlist.name}
                      </Button>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">You don't have any playlists yet. Create one first!</p>
                  )}
                </ScrollArea>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-gray-800 text-white hover:bg-gray-700 text-sm py-2">
                    Cancel
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Delete Playlist AlertDialog */}
            <AlertDialog open={showDeletePlaylistDialog} onOpenChange={setShowDeletePlaylistDialog}>
              <AlertDialogContent className="bg-gray-900 border border-gray-800 text-white max-w-[95vw] p-4">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg font-bold">Delete Playlist</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-gray-400">
                    Are you sure you want to delete the playlist "{playlistToDelete?.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-gray-800 text-white hover:bg-gray-700 text-sm py-2">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDeletePlaylist} className="bg-red-600 text-white hover:bg-red-700 text-sm py-2">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showLogoutAlert} onOpenChange={setShowLogoutAlert}>
              <AlertDialogContent className="bg-gray-900 border border-gray-800 text-white max-w-[95vw] p-4">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg font-bold">Are you sure you want to sign out?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-gray-400">
                    Your playlists and other data will remain saved in your account. You can log back in anytime to access them.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-gray-800 text-white hover:bg-gray-700 text-sm py-2">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={performLogout}
                    className="bg-red-600 text-white hover:bg-red-700 text-sm py-2"
                  >
                    Sign me out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>
        )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}