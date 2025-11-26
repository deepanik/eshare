import React, { useState, useEffect, useMemo } from 'react';
import { authService } from '../../services/auth/authService';
import { supabase } from '../../services/supabase/supabaseClient';

function Report({ themeMode = 'light' }) {
  // Track system preference changes for 'system' mode
  const [systemPreference, setSystemPreference] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  
  // Determine if dark mode is active
  const darkMode = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    // For 'system', use system preference
    if (themeMode === 'system') {
      return systemPreference;
    }
    return false;
  }, [themeMode, systemPreference]);
  
  // Listen for system theme changes if in system mode
  useEffect(() => {
    if (themeMode === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        setSystemPreference(e.matches);
      };
      
      // Set initial value
      setSystemPreference(mediaQuery.matches);
      
      // Listen for changes
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [selectedDiagram, setSelectedDiagram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [overviewData, setOverviewData] = useState({
    projectTitle: "eShare",
    projectDescription: "",
    video: {
      title: "Project Demo Video",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      description: "Complete walkthrough of all features and functionalities"
    },
    report: {
      title: "Project Documentation",
      url: "https://example.com/dashboard",
      description: "Detailed technical documentation and implementation guide"
    },
    ppt: {
      title: "Project Presentation",
      url: "https://example.com/dashboard",
      description: "Comprehensive project presentation slides"
    },
    uml: {
      title: "System Architecture Diagrams",
      description: "UML diagrams including class, sequence, and use case diagrams",
      diagrams: []
    },
    
  });

  // Load report data from database
  const loadReportData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_reports')
        .select('*')
        .eq('id', 'main')
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading report data:', error);
        // Fallback to default data
        return;
      }
      
      if (data && data.report_data) {
        // Restore blob URLs from base64 for images
        const restoredData = { ...data.report_data };
        if (restoredData.uml && restoredData.uml.diagrams) {
          restoredData.uml.diagrams = restoredData.uml.diagrams.map(diagram => {
            if (diagram.type === 'image' && diagram.base64 && !diagram.url) {
              // Restore blob URL from base64
              return { ...diagram, url: diagram.base64 };
            }
            return diagram;
          });
        }
        setOverviewData(restoredData);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save report data to database
  const saveReportData = async (data) => {
    try {
      const { error } = await supabase
        .from('project_reports')
        .upsert({
          id: 'main',
          report_data: data,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });
      
      if (error) {
        console.error('Error saving report data:', error);
        // Fallback to localStorage
        localStorage.setItem('overviewData', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error saving report data:', error);
      // Fallback to localStorage
      localStorage.setItem('overviewData', JSON.stringify(data));
    }
  };

  // Check admin status and load data on component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
        
        // Check if user is admin (username === 'deepanik')
        const adminStatus = user?.username === 'deepanik' || adminStatus = user?.username === 'prateek';
        setIsAdmin(adminStatus);
        
        // Load report data from database
        await loadReportData();
      } catch (error) {
        console.error('Error initializing report:', error);
        setLoading(false);
      }
    };
    
    initialize();
  }, []);

  // Note: Data is saved directly in each edit function, not via useEffect
  // This prevents unnecessary saves on every state change

  // Close popup when clicking outside or pressing Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setSelectedDiagram(null);
      }
    };

    const handleClickOutside = (e) => {
      if (e.target.classList.contains('popup-overlay')) {
        setSelectedDiagram(null);
      }
    };

    if (selectedDiagram) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('click', handleClickOutside);
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [selectedDiagram]);

  const startEditing = (section, field = null) => {
    if (!isAdmin) return;
    setEditingSection(field ? `${section}.${field}` : section);
  };

  const saveEdit = async (section, value, field = null) => {
    if (!isAdmin) return;
    
    const updatedData = { ...overviewData };
    if (field) {
      const [parent, child] = section.split('.');
      updatedData[parent][child] = value;
    } else {
      updatedData[section] = value;
    }
    
    setOverviewData(updatedData);
    setEditingSection(null);
    
    // Save to database
    await saveReportData(updatedData);
  };

  const cancelEdit = () => {
    setEditingSection(null);
  };

  const handleInputChange = (e, section, field = null) => {
    if (!isAdmin) return;
    
    const value = e.target.value;
    setOverviewData(prev => {
      const newData = { ...prev };
      if (field) {
        const [parent, child] = section.split('.');
        newData[parent][child] = value;
      } else {
        newData[section] = value;
      }
      return newData;
    });
  };

  const addFeature = async () => {
    if (!isAdmin) return;
    const newFeature = prompt("Enter new feature:");
    if (newFeature) {
      const updatedData = {
        ...overviewData,
        features: [...overviewData.features, newFeature]
      };
      setOverviewData(updatedData);
      await saveReportData(updatedData);
    }
  };

  const removeFeature = async (index) => {
    if (!isAdmin) return;
    const updatedData = {
      ...overviewData,
      features: overviewData.features.filter((_, i) => i !== index)
    };
    setOverviewData(updatedData);
    await saveReportData(updatedData);
  };

  const addTeamMember = async () => {
    if (!isAdmin) return;
    const name = prompt("Enter team member name:");
    const role = prompt("Enter team member role:");
    if (name && role) {
      const updatedData = {
        ...overviewData,
        team: [...overviewData.team, { name, role }]
      };
      setOverviewData(updatedData);
      await saveReportData(updatedData);
    }
  };

  const removeTeamMember = async (index) => {
    if (!isAdmin) return;
    const updatedData = {
      ...overviewData,
      team: overviewData.team.filter((_, i) => i !== index)
    };
    setOverviewData(updatedData);
    await saveReportData(updatedData);
  };

  // Upload file to Supabase Storage
  const uploadFileToStorage = async (file, folder = 'reports') => {
    try {
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('You must be logged in to upload files. Please sign in and try again.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Use correct bucket name: "eShare" (capital E and S)
      const { data, error } = await supabase.storage
        .from('eShare')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Error uploading file:', error);
        
        // Provide more helpful error messages
        if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
          throw new Error('Storage bucket "eShare" not found. Please check your Supabase Storage configuration.');
        } else if (error.message?.includes('new row violates row-level security')) {
          throw new Error('Permission denied. Please check your Storage bucket policies.');
        } else if (error.message?.includes('JWT')) {
          throw new Error('Authentication failed. Please sign in again.');
        }
        
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('eShare')
        .getPublicUrl(fileName);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading to Supabase Storage:', error);
      
      // Return a more user-friendly error message
      if (error.message) {
        throw new Error(error.message);
      }
      
      throw new Error('Failed to upload file. Please check your connection and try again.');
    }
  };

  // Handle Report file upload
  const handleReportUpload = async (event) => {
    if (!isAdmin) return;
    
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const fileUrl = await uploadFileToStorage(file, 'reports');
      
      const updatedData = {
        ...overviewData,
        report: {
          ...overviewData.report,
          url: fileUrl,
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString()
        }
      };
      
      setOverviewData(updatedData);
      await saveReportData(updatedData);
      
      alert('✅ Report file uploaded successfully!');
    } catch (error) {
      console.error('Error uploading report:', error);
      const errorMessage = error.message || 'Failed to upload report file. Please try again.';
      alert(`❌ Upload failed: ${errorMessage}`);
    }
    
    event.target.value = '';
  };

  // Handle PPT file upload
  const handlePPTUpload = async (event) => {
    if (!isAdmin) return;
    
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const fileUrl = await uploadFileToStorage(file, 'presentations');
      
      const updatedData = {
        ...overviewData,
        ppt: {
          ...overviewData.ppt,
          url: fileUrl,
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString()
        }
      };
      
      setOverviewData(updatedData);
      await saveReportData(updatedData);
      
      alert('✅ Presentation file uploaded successfully!');
    } catch (error) {
      console.error('Error uploading PPT:', error);
      const errorMessage = error.message || 'Failed to upload presentation file. Please try again.';
      alert(`❌ Upload failed: ${errorMessage}`);
    }
    
    event.target.value = '';
  };

  // Handle UML diagram upload
  const handleDiagramUpload = async (event) => {
    if (!isAdmin) return;
    
    const files = Array.from(event.target.files);
    
    // Upload images to Supabase Storage, convert others to base64
    const newDiagrams = await Promise.all(files.map(async (file) => {
      let url = URL.createObjectURL(file);
      let storageUrl = null;
      
      // Upload images to Supabase Storage
      if (file.type.startsWith('image/')) {
        try {
          storageUrl = await uploadFileToStorage(file, 'diagrams');
          url = storageUrl; // Use storage URL instead of blob URL
        } catch (error) {
          console.error('Error uploading diagram:', error);
          // Fall back to base64 if storage fails
          const reader = new FileReader();
          const base64 = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          url = base64;
        }
      } else {
        // For documents, convert to base64
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        url = base64;
      }
      
      return {
        id: Date.now() + Math.random(),
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'document',
        url: url,
        storageUrl: storageUrl, // Store Supabase URL if available
        uploadedAt: new Date().toLocaleDateString()
      };
    }));

    const updatedData = {
      ...overviewData,
      uml: {
        ...overviewData.uml,
        diagrams: [...overviewData.uml.diagrams, ...newDiagrams]
      }
    };
    
    setOverviewData(updatedData);
    await saveReportData(updatedData);

    // Clear the input
    event.target.value = '';
  };

  const removeDiagram = async (diagramId) => {
    if (!isAdmin) return;
    const updatedData = {
      ...overviewData,
      uml: {
        ...overviewData.uml,
        diagrams: overviewData.uml.diagrams.filter(diagram => diagram.id !== diagramId)
      }
    };
    setOverviewData(updatedData);
    await saveReportData(updatedData);
  };

  const openDiagramPopup = (diagram) => {
    if (diagram.type === 'image') {
      setSelectedDiagram(diagram);
    }
  };

  const closePopup = () => {
    setSelectedDiagram(null);
  };

  const navigateDiagram = (direction) => {
    if (!selectedDiagram) return;
    
    const currentIndex = overviewData.uml.diagrams.findIndex(d => d.id === selectedDiagram.id);
    const imagesOnly = overviewData.uml.diagrams.filter(d => d.type === 'image');
    const currentImageIndex = imagesOnly.findIndex(d => d.id === selectedDiagram.id);
    
    if (direction === 'next') {
      const nextIndex = (currentImageIndex + 1) % imagesOnly.length;
      setSelectedDiagram(imagesOnly[nextIndex]);
    } else {
      const prevIndex = (currentImageIndex - 1 + imagesOnly.length) % imagesOnly.length;
      setSelectedDiagram(imagesOnly[prevIndex]);
    }
  };

  // Carousel navigation functions
  // Carousel navigation functions
  const getItemsPerView = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth <= 480) return 1;
      if (window.innerWidth <= 768) return 2;
      return 3;
    }
    return 3;
  };
  
  const [itemsPerView, setItemsPerView] = useState(getItemsPerView());
  
  useEffect(() => {
    const handleResize = () => {
      setItemsPerView(getItemsPerView());
      setCarouselIndex(0); // Reset on resize
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const nextCarousel = () => {
    const maxIndex = Math.max(0, overviewData.uml.diagrams.length - itemsPerView);
    setCarouselIndex(prev => {
      const next = prev + 1;
      return next > maxIndex ? maxIndex : next;
    });
  };

  const prevCarousel = () => {
    setCarouselIndex(prev => Math.max(prev - 1, 0));
  };

  // Reset carousel index when diagrams change
  useEffect(() => {
    setCarouselIndex(0);
  }, [overviewData.uml.diagrams.length]);

  // Inline Styles
  const styles = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      transition: all 0.3s ease;
    }
    
    body {
      font-family: 'Inter', -Reportle-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.6;
    }
    
    .dark {
      background: linear-gradient(135deg, #0f172a, #1e293b);
      color: #e2e8f0;
    }
    
    .light {
      background: linear-gradient(135deg, #f8fafc, #e2e8f0);
      color: #334155;
    }
    
    .glass {
      backdrop-filter: blur(16px);
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .dark .glass {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .light .glass {
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(0, 0, 0, 0.1);
      color: #334155;
    }
    
    .card-hover {
      transition: all 0.3s ease;
    }
    
    .card-hover:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }
    
    .admin-edit {
      border: 2px dashed #3b82f6;
      position: relative;
    }
    
    .admin-edit::before {
      content: 'Click to Edit';
      position: absolute;
      top: -10px;
      right: -10px;
      background: #3b82f6;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .admin-edit:hover::before {
      opacity: 1;
    }

    /* Carousel layout for diagrams - Improved Design */
    .diagram-carousel-wrapper {
      position: relative;
      width: 100%;
      overflow: hidden;
      margin-top: 20px;
      padding: 10px 0;
    }

    .diagram-rows {
      position: relative;
      width: 100%;
      overflow: hidden;
      padding: 0 50px; /* Space for navigation buttons */
    }

    .diagram-carousel-container {
      display: flex;
      transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      gap: 20px;
      will-change: transform;
    }

    .carousel-nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      color: white;
      border: none;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: all 0.3s ease;
      font-size: 28px;
      font-weight: bold;
      box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
      backdrop-filter: blur(10px);
    }

    .carousel-nav-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      transform: translateY(-50%) scale(1.1);
      box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6);
    }

    .carousel-nav-btn:active:not(:disabled) {
      transform: translateY(-50%) scale(0.95);
    }

    .carousel-nav-btn:disabled {
      opacity: 0.2;
      cursor: not-allowed;
      background: rgba(139, 92, 246, 0.3);
    }

    .carousel-nav-btn.prev {
      left: 0;
    }

    .carousel-nav-btn.next {
      right: 0;
    }

    .diagram-row {
      flex: 0 0 calc((100% - 40px) / 3);
      min-width: 0;
      max-width: calc((100% - 40px) / 3);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .light .diagram-row {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    @media (max-width: 768px) {
      .diagram-rows {
        padding: 0 45px;
      }
      
      .diagram-row {
        flex: 0 0 calc((100% - 20px) / 2);
        max-width: calc((100% - 20px) / 2);
      }
      
      .carousel-nav-btn {
        width: 40px;
        height: 40px;
        font-size: 24px;
      }
    }

    @media (max-width: 480px) {
      .diagram-rows {
        padding: 0 40px;
      }
      
      .diagram-row {
        flex: 0 0 100%;
        max-width: 100%;
      }
      
      .carousel-nav-btn {
        width: 35px;
        height: 35px;
        font-size: 20px;
      }
    }

    .diagram-row {
      display: flex;
      flex-direction: column;
      padding: 18px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      min-height: 220px;
      overflow: hidden;
    }

    .light .diagram-row {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(0, 0, 0, 0.08);
      color: #334155;
    }

    .diagram-row::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #8b5cf6, #7c3aed);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .diagram-row:hover::before {
      opacity: 1;
    }

    .diagram-row:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-8px) scale(1.02);
      box-shadow: 0 12px 30px rgba(139, 92, 246, 0.25);
      border-color: rgba(139, 92, 246, 0.3);
    }

    .light .diagram-row:hover {
      background: rgba(255, 255, 255, 1);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
      border-color: rgba(139, 92, 246, 0.2);
    }

    .diagram-preview {
      width: 100%;
      height: 160px;
      border-radius: 12px;
      overflow: hidden;
      flex-shrink: 0;
      cursor: pointer;
      margin-bottom: 14px;
      position: relative;
      background: rgba(0, 0, 0, 0.1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .diagram-preview::after {
      content: '👁️';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 14px;
      transition: transform 0.3s ease;
      pointer-events: none;
    }

    .diagram-preview:hover::after {
      transform: translate(-50%, -50%) scale(1);
    }

    .diagram-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .diagram-preview:hover img {
      transform: scale(1.08);
    }

    .diagram-document {
      width: 100%;
      height: 160px;
      border-radius: 12px;
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 52px;
      flex-shrink: 0;
      margin-bottom: 14px;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
      transition: transform 0.3s ease;
    }

    .diagram-document:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
    }

    .diagram-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .dark .diagram-info {
      color: white;
    }

    .light .diagram-info {
      color: #334155;
    }

    .diagram-name {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 6px;
      word-break: break-word;
      line-height: 1.4;
      color: inherit;
    }

    .diagram-date {
      font-size: 11px;
      opacity: 0.7;
      margin-bottom: 10px;
      font-weight: 400;
    }

    .light .diagram-date {
      color: #64748b;
    }

    .diagram-type {
      display: inline-block;
      padding: 6px 12px;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
      color: #3b82f6;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      width: fit-content;
      border: 1px solid rgba(59, 130, 246, 0.3);
      transition: all 0.3s ease;
    }

    .diagram-row:hover .diagram-type {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.3));
      transform: scale(1.05);
    }

    .diagram-remove-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(239, 68, 68, 0.9);
      color: white;
      border: none;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: all 0.3s ease;
    }

    .diagram-remove-btn:hover {
      background: rgba(239, 68, 68, 1);
      transform: scale(1.1);
    }

    .upload-area {
      border: 2px dashed #3b82f6;
      border-radius: 12px;
      padding: 40px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: rgba(59, 130, 246, 0.1);
      margin-top: 20px;
    }

    .upload-area:hover {
      background: rgba(59, 130, 246, 0.2);
      transform: scale(1.02);
    }

    .upload-icon {
      font-size: 48px;
      margin-bottom: 16px;
      color: #3b82f6;
    }

    /* Popup Styles */
    .popup-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
      overflow: hidden;
      box-sizing: border-box;
    }

    .popup-content {
      position: relative;
      max-width: 95vw;
      max-height: 95vh;
      background: white;
      border-radius: 12px;
      overflow: auto;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    .popup-image {
      width: 100%;
      height: auto;
      max-height: calc(95vh - 120px);
      max-width: 100%;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }

    .popup-info {
      padding: 20px;
      background: white;
      color: #1f2937;
      text-align: center;
    }

    .popup-close {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1001;
      transition: all 0.3s ease;
    }

    .popup-close:hover {
      background: rgba(239, 68, 68, 0.9);
      transform: scale(1.1);
    }

    .popup-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: none;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1001;
      transition: all 0.3s ease;
    }

    .popup-nav:hover {
      background: rgba(59, 130, 246, 0.9);
      transform: translateY(-50%) scale(1.1);
    }

    .popup-prev {
      left: 20px;
    }

    .popup-next {
      right: 20px;
    }

    .popup-counter {
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 1001;
    }

    @media (max-width: 768px) {
      .diagram-rows {
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 15px;
      }
      
      .diagram-row {
        min-height: 180px;
        padding: 12px;
      }
      
      .diagram-preview,
      .diagram-document {
        height: 120px;
      }
      
      .diagram-name {
        font-size: 14px;
      }
      
      .diagram-date {
        font-size: 11px;
      }
      
      .popup-nav {
        width: 40px;
        height: 40px;
        font-size: 18px;
      }
      
      .popup-close {
        width: 35px;
        height: 35px;
        font-size: 16px;
      }
    }

    @media (min-width: 769px) {
      .diagram-rows {
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      }
    }

    @media (max-width: 480px) {
      .diagram-rows {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
      }
    }
  `;

  const EditableText = ({ children, section, field = null, className = "" }) => {
    const fullSection = field ? `${section}.${field}` : section;
    const isEditing = editingSection === fullSection;
    const value = field ? overviewData[section][field] : overviewData[section];

    if (isEditing) {
      return (
        <div style={{ position: 'relative' }}>
          <textarea
            value={value}
            onChange={(e) => {
              const newValue = e.target.value;
              const updatedData = { ...overviewData };
              if (field) {
                const [parent, child] = section.split('.');
                updatedData[parent][child] = newValue;
              } else {
                updatedData[section] = newValue;
              }
              setOverviewData(updatedData);
            }}
            onBlur={async () => {
              // Save to database when user finishes editing
              const currentValue = field ? overviewData[section][field] : overviewData[section];
              await saveEdit(section, currentValue, field);
            }}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '8px',
              border: '2px solid #3b82f6',
              background: darkMode ? '#1e293b' : 'white',
              color: darkMode ? 'white' : '#334155',
              minHeight: '100px',
              resize: 'vertical'
            }}
            autoFocus
          />
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <button
              onClick={async () => await saveEdit(section, value, field)}
              style={{
                padding: '4px 12px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Save
            </button>
            <button
              onClick={cancelEdit}
              style={{
                padding: '4px 12px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => isAdmin && startEditing(section, field)}
        className={`${isAdmin ? 'admin-edit' : ''} ${className}`}
        style={{ cursor: isAdmin ? 'pointer' : 'default' }}
      >
        {children}
      </div>
    );
  };

  // Get image count for popup counter
  const getImageCount = () => {
    const imagesOnly = overviewData.uml.diagrams.filter(d => d.type === 'image');
    const currentIndex = imagesOnly.findIndex(d => d.id === selectedDiagram?.id);
    return { current: currentIndex + 1, total: imagesOnly.length };
  };

  const imageCount = getImageCount();

  if (loading) {
    return (
      <div className={darkMode ? 'dark' : 'light'} style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className={darkMode ? 'dark' : 'light'} style={{ minHeight: '100vh' }}>
        
        {/* Full Screen Popup */}
        {selectedDiagram && (
          <div className="popup-overlay">
            <div className="popup-content">
              <button className="popup-close" onClick={closePopup}>
                ×
              </button>
              
              {imageCount.total > 1 && (
                <>
                  <button 
                    className="popup-nav popup-prev" 
                    onClick={() => navigateDiagram('prev')}
                  >
                    ‹
                  </button>
                  <button 
                    className="popup-nav popup-next" 
                    onClick={() => navigateDiagram('next')}
                  >
                    ›
                  </button>
                  <div className="popup-counter">
                    {imageCount.current} / {imageCount.total}
                  </div>
                </>
              )}
              
              <img 
                src={selectedDiagram.url} 
                alt={selectedDiagram.name}
                className="popup-image"
              />
              <div className="popup-info">
                <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>
                  {selectedDiagram.name}
                </h3>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                  Uploaded on {selectedDiagram.uploadedAt}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <header style={{
          padding: '20px 0',
          background: darkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <EditableText section="projectTitle" className="text-3xl font-bold">
              <h1 style={{
                fontSize: '32px',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {overviewData.projectTitle}
              </h1>
            </EditableText>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {isAdmin && (
                <div style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  background: '#10b981',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  🔓 Admin Mode
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 20px'
        }}>
          <section style={{ marginBottom: '60px' }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '40px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Project Deliverables
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '30px'
            }}>
              {/* Video Section */}
              <div className="glass card-hover" style={{
                padding: '30px',
                borderRadius: '20px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, #ef4444, #f97316)',
                  borderRadius: '15px',
                  margin: '0 auto 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  🎥
                </div>
                <EditableText section="video" field="title">
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    marginBottom: '15px',
                    color: darkMode ? '#e2e8f0' : '#1e293b'
                  }}>
                    {overviewData.video.title}
                  </h3>
                </EditableText>
                
                <EditableText section="video" field="description">
                  <p style={{
                    color: darkMode ? '#cbd5e1' : '#64748b',
                    marginBottom: '20px',
                    fontSize: '14px'
                  }}>
                    {overviewData.video.description}
                  </p>
                </EditableText>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: darkMode ? '#cbd5e1' : '#64748b'
                  }}>
                    YouTube Embed URL {isAdmin && <span style={{ color: '#3b82f6' }}>(Editable)</span>}
                  </label>
                  <input
                    type="text"
                    value={overviewData.video.url}
                    onChange={(e) => {
                      const updatedData = {
                        ...overviewData,
                        video: {
                          ...overviewData.video,
                          url: e.target.value
                        }
                      };
                      setOverviewData(updatedData);
                    }}
                    onBlur={async () => {
                      await saveReportData(overviewData);
                    }}
                    placeholder="https://www.youtube.com/embed/VIDEO_ID"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: isAdmin ? '2px solid #3b82f6' : '1px solid #ccc',
                      background: darkMode ? '#1e293b' : 'white',
                      color: darkMode ? 'white' : '#334155',
                      fontSize: '14px',
                      transition: 'border-color 0.3s ease'
                    }}
                    disabled={!isAdmin}
                    readOnly={!isAdmin}
                  />
                </div>

                {overviewData.video.url && (
                  <div style={{
                    position: 'relative',
                    paddingBottom: '56.25%',
                    height: 0,
                    marginBottom: '20px'
                  }}>
                    <iframe
                      src={overviewData.video.url}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: '12px'
                      }}
                      frameBorder="0"
                      allowFullScreen
                      title="Project Demo Video"
                    />
                  </div>
                )}
                
                <a
                  href={overviewData.video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #ef4444, #f97316)',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '25px',
                    fontWeight: '500',
                    transition: 'transform 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                  Watch Full Video
                </a>
              </div>

              {/* Report Section */}
              <div className="glass card-hover" style={{
                padding: '30px',
                borderRadius: '20px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  borderRadius: '15px',
                  margin: '0 auto 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  📄
                </div>
                <EditableText section="report" field="title">
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    marginBottom: '15px',
                    color: darkMode ? '#e2e8f0' : '#1e293b'
                  }}>
                    {overviewData.report.title}
                  </h3>
                </EditableText>
                
                <EditableText section="report" field="description">
                  <p style={{
                    color: darkMode ? '#cbd5e1' : '#64748b',
                    marginBottom: '25px',
                    fontSize: '14px'
                  }}>
                    {overviewData.report.description}
                  </p>
                </EditableText>

                {isAdmin && (
                  <label style={{
                    display: 'inline-block',
                    marginBottom: '15px',
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: 'white',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'transform 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    📤 Upload Report File
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleReportUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}

                {overviewData.report.url && (
                  <a
                    href={overviewData.report.url}
                    download={overviewData.report.fileName || 'report'}
                    style={{
                      display: 'inline-block',
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '25px',
                      fontWeight: '500',
                      transition: 'transform 0.3s ease',
                      marginTop: '10px'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    📥 Download Report
                    {overviewData.report.fileName && (
                      <span style={{ display: 'block', fontSize: '12px', marginTop: '4px', opacity: 0.9 }}>
                        {overviewData.report.fileName}
                      </span>
                    )}
                  </a>
                )}
              </div>

              {/* PPT Section */}
              <div className="glass card-hover" style={{
                padding: '30px',
                borderRadius: '20px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  borderRadius: '15px',
                  margin: '0 auto 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  📊
                </div>
                <EditableText section="ppt" field="title">
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    marginBottom: '15px',
                    color: darkMode ? '#e2e8f0' : '#1e293b'
                  }}>
                    {overviewData.ppt.title}
                  </h3>
                </EditableText>
                
                <EditableText section="ppt" field="description">
                  <p style={{
                    color: darkMode ? '#cbd5e1' : '#64748b',
                    marginBottom: '25px',
                    fontSize: '14px'
                  }}>
                    {overviewData.ppt.description}
                  </p>
                </EditableText>

                {isAdmin && (
                  <label style={{
                    display: 'inline-block',
                    marginBottom: '15px',
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: 'white',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'transform 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    📤 Upload PPT File
                    <input
                      type="file"
                      accept=".ppt,.pptx,.pdf"
                      onChange={handlePPTUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}

                {overviewData.ppt.url && (
                  <a
                    href={overviewData.ppt.url}
                    download={overviewData.ppt.fileName || 'presentation'}
                    style={{
                      display: 'inline-block',
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '25px',
                      fontWeight: '500',
                      transition: 'transform 0.3s ease',
                      marginTop: '10px'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    📥 Download Presentation
                    {overviewData.ppt.fileName && (
                      <span style={{ display: 'block', fontSize: '12px', marginTop: '4px', opacity: 0.9 }}>
                        {overviewData.ppt.fileName}
                      </span>
                    )}
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* System Architecture Diagrams Section - Separate Professional Section */}
          <section style={{ marginBottom: '60px' }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '40px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              System Architecture Diagrams
            </h2>

            <div className="glass card-hover" style={{
              padding: '40px',
              borderRadius: '20px',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '15px',
                marginBottom: '30px'
              }}>
                <div style={{
                  width: '70px',
                  height: '70px',
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  borderRadius: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  boxShadow: '0 8px 20px rgba(139, 92, 246, 0.3)'
                }}>
                  📐
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <EditableText section="uml" field="title">
                    <h3 style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      marginBottom: '10px',
                      color: darkMode ? '#e2e8f0' : '#1e293b'
                    }}>
                      {overviewData.uml.title}
                    </h3>
                  </EditableText>
                  
                  <EditableText section="uml" field="description">
                    <p style={{
                      color: darkMode ? '#cbd5e1' : '#64748b',
                      fontSize: '16px',
                      lineHeight: '1.6'
                    }}>
                      {overviewData.uml.description}
                    </p>
                  </EditableText>
                </div>
              </div>

                {/* UML Diagrams Display in Carousel */}
                {overviewData.uml.diagrams.length > 0 ? (
                  <div className="diagram-carousel-wrapper">
                    <div className="diagram-rows">
                      <div 
                        className="diagram-carousel-container"
                        style={{
                          transform: `translateX(calc(-${carouselIndex} * ((100% - ${(itemsPerView - 1) * 15}px) / ${itemsPerView} + 15px)))`
                        }}
                      >
                        {overviewData.uml.diagrams.map((diagram) => (
                          <div 
                            key={diagram.id} 
                            className="diagram-row"
                          >
                            {isAdmin && (
                              <button
                                className="diagram-remove-btn"
                                onClick={() => removeDiagram(diagram.id)}
                                title="Remove diagram"
                              >
                                ×
                              </button>
                            )}
                            
                            {diagram.type === 'image' ? (
                              <div 
                                className="diagram-preview"
                                onClick={() => openDiagramPopup(diagram)}
                              >
                                <img 
                                  src={diagram.url} 
                                  alt={diagram.name}
                                />
                              </div>
                            ) : (
                              <div className="diagram-document">
                                📄
                              </div>
                            )}
                            
                            <div className="diagram-info">
                              <div className="diagram-name">{diagram.name}</div>
                              <div className="diagram-date">Uploaded on {diagram.uploadedAt}</div>
                              <span className="diagram-type">
                                {diagram.type === 'image' ? 'Image' : 'Document'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Carousel Navigation Buttons */}
                      {overviewData.uml.diagrams.length > itemsPerView && (
                        <>
                          <button
                            className="carousel-nav-btn prev"
                            onClick={prevCarousel}
                            disabled={carouselIndex === 0}
                            aria-label="Previous"
                          >
                            ‹
                          </button>
                          <button
                            className="carousel-nav-btn next"
                            onClick={nextCarousel}
                            disabled={carouselIndex >= Math.max(0, overviewData.uml.diagrams.length - itemsPerView)}
                            aria-label="Next"
                          >
                            ›
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
                
                {/* Upload Area for Admin */}
                {isAdmin && (
                  <label className="upload-area" style={{ marginTop: '20px' }}>
                    <div className="upload-icon">📁</div>
                    <p style={{ 
                      fontSize: '16px', 
                      fontWeight: 'bold',
                      marginBottom: '8px',
                      color: darkMode ? 'white' : '#334155'
                    }}>
                      Upload UML/Class Diagrams
                    </p>
                    <p style={{ 
                      fontSize: '14px', 
                      opacity: 0.8,
                      marginBottom: '16px',
                      color: darkMode ? '#cbd5e1' : '#64748b'
                    }}>
                      Click to upload images or documents
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleDiagramUpload}
                      style={{ display: 'none' }}
                    />
                    <div style={{
                      padding: '8px 16px',
                      background: '#3b82f6',
                      color: 'white',
                      borderRadius: '20px',
                      fontSize: '14px',
                      display: 'inline-block'
                    }}>
                      Choose Files
                    </div>
                  </label>
                )}

              {overviewData.uml.diagrams.length === 0 && !isAdmin && (
                <p style={{ 
                  textAlign: 'center', 
                  color: darkMode ? '#94a3b8' : '#94a3b8',
                  fontStyle: 'italic',
                  marginTop: '20px',
                  padding: '40px'
                }}>
                  No diagrams uploaded yet
                </p>
              )}
            </div>
          </section>
          
          {/* Project Overview */}
          <section style={{ marginBottom: '60px' }}>
            <EditableText section="projectDescription">
              <p style={{
                fontSize: '18px',
                lineHeight: '1.8',
                textAlign: 'center',
                maxWidth: '800px',
                margin: '0 auto 40px',
                color: darkMode ? '#cbd5e1' : '#475569'
              }}>
                {overviewData.projectDescription}
              </p>
            </EditableText>

            {/* Features Grid */}
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: '30px',
                color: darkMode ? '#e2e8f0' : '#1e293b'
              }}>
                Key Features
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px'
              }}>
                {overviewData.features.map((feature, index) => (
                  <div
                    key={index}
                    className="glass card-hover"
                    style={{
                      padding: '20px',
                      borderRadius: '16px',
                      textAlign: 'center',
                      position: 'relative'
                    }}
                  >
                    <div style={{
                      width: '50px',
                      height: '50px',
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      borderRadius: '12px',
                      margin: '0 auto 15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px'
                    }}>
                      ⚡
                    </div>
                    <p style={{ 
                      fontSize: '16px', 
                      fontWeight: '500',
                      color: darkMode ? '#e2e8f0' : '#334155'
                    }}>
                      {feature}
                    </p>
                    {isAdmin && (
                      <button
                        onClick={() => removeFeature(index)}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {isAdmin && (
                  <div
                    onClick={addFeature}
                    className="glass card-hover"
                    style={{
                      padding: '20px',
                      borderRadius: '16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: '2px dashed #3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ fontSize: '24px', color: '#3b82f6' }}>+</div>
                    <p style={{ color: darkMode ? '#e2e8f0' : '#334155' }}>Add New Feature</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

export default Report;
