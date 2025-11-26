import React, { useState, useEffect, useMemo } from 'react'
import {
  GitHub as GitHubIcon,
  LinkedIn as LinkedInIcon,
  Language as PortfolioIcon,
  Email as EmailIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  Remove as RemoveIcon
} from '@mui/icons-material'
import { authService } from '../../services/auth/authService'
import { supabase } from '../../services/supabase/supabaseClient'

// Inline CSS to avoid Tailwind import issues
const styles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, transform 0.3s ease;
  }
  
  body {
    font-family: 'Inter', -Devloperle-system, BlinkMacSystemFont, sans-serif;
  }
  
  .dark {
    background-color: #1f2937;
    color: white;
  }
  
  .light {
    background-color: #f9fafb;
    color: #1f2937;
  }
`

function Devloper({ themeMode = 'light' }) {
  // Track system preference changes for 'system' mode
  const [systemPreference, setSystemPreference] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })
  
  // Determine if dark mode is active
  // themeMode can be 'light', 'dark', or 'system'
  const darkMode = useMemo(() => {
    if (themeMode === 'dark') return true
    if (themeMode === 'light') return false
    // For 'system', use system preference
    if (themeMode === 'system') {
      return systemPreference
    }
    return false
  }, [themeMode, systemPreference])
  
  // Listen for system theme changes if in system mode
  useEffect(() => {
    if (themeMode === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e) => {
        setSystemPreference(e.matches)
      }
      
      // Set initial value
      setSystemPreference(mediaQuery.matches)
      
      // Listen for changes
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [themeMode])

  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingStudent, setEditingStudent] = useState(null)
  const [editingField, setEditingField] = useState(null)
  
  // Helper function to ensure skills is always an array
  const ensureSkillsArray = (student) => {
    if (Array.isArray(student.skills)) {
      return student.skills
    }
    if (typeof student.skills === 'string') {
      return student.skills.split(',').map(s => s.trim()).filter(s => s)
    }
    return ['Skill 1']
  }
  
  const [students, setStudents] = useState([
    {
      id: 1,
      name: "Alice Johnson",
      role: "Frontend Developer",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=200&fit=crop&crop=face",
      bio: "Passionate about creating beautiful and responsive web applications.",
      skills: ["React", "JavaScript", "CSS", "TypeScript"],
      github: "https://github.com/alicejohnson",
      linkedin: "https://linkedin.com/in/alicejohnson",
      portfolio: "https://alicejohnson.dev",
      email: "alice@example.com"
    },
    {
      id: 2,
      name: "Bob Smith",
      role: "Full Stack Developer",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
      bio: "Full-stack developer with expertise in MERN stack.",
      skills: ["Node.js", "MongoDB", "Express", "React"],
      github: "https://github.com/bobsmith",
      linkedin: "https://linkedin.com/in/bobsmith",
      portfolio: "https://bobsmith.dev",
      email: "bob@example.com"
    },
    {
      id: 3,
      name: "Carol Davis",
      role: "UI/UX Developer",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
      bio: "Focuses on creating intuitive user experiences with clean designs.",
      skills: ["Figma", "UI/UX", "React", "SASS"],
      github: "https://github.com/caroldavis",
      linkedin: "https://linkedin.com/in/caroldavis",
      portfolio: "https://caroldavis.design",
      email: "carol@example.com"
    },
    {
      id: 4,
      name: "David Wilson",
      role: "Backend Developer",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
      bio: "Backend specialist with strong database and API development skills.",
      skills: ["Python", "Django", "PostgreSQL", "Docker"],
      github: "https://github.com/davidwilson",
      linkedin: "https://linkedin.com/in/davidwilson",
      portfolio: "https://davidwilson.dev",
      email: "david@example.com"
    }
  ].map(student => ({
    ...student,
    skills: ensureSkillsArray(student)
  })))

  // Load developer data from database
  const loadDeveloperData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('project_reports')
        .select('*')
        .eq('id', 'developers')
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading developer data:', error)
        return
      }
      
      if (data && data.report_data && data.report_data.students) {
        // Ensure all students have valid skills arrays
        const validatedStudents = data.report_data.students.map(student => ({
          ...student,
          skills: ensureSkillsArray(student)
        }))
        setStudents(validatedStudents)
      }
    } catch (error) {
      console.error('Error loading developer data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Save developer data to database
  const saveDeveloperData = async (studentsData) => {
    try {
      const { error } = await supabase
        .from('project_reports')
        .upsert({
          id: 'developers',
          report_data: { students: studentsData },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
      
      if (error) {
        console.error('Error saving developer data:', error)
        // Fallback to localStorage
        localStorage.setItem('developerData', JSON.stringify(studentsData))
      }
    } catch (error) {
      console.error('Error saving developer data:', error)
      // Fallback to localStorage
      localStorage.setItem('developerData', JSON.stringify(studentsData))
    }
  }

  // Check admin status and load data on component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const user = await authService.getCurrentUser()
        setCurrentUser(user)
        
        // Check if user is admin (username === 'deepanik')
        const adminStatus = user?.username === 'deepanik' 'prateek'
        setIsAdmin(adminStatus)
        
        // Load developer data from database
        await loadDeveloperData()
      } catch (error) {
        console.error('Error initializing developer:', error)
        setLoading(false)
      }
    }
    
    initialize()
  }, [])

  // Add new student
  const addStudent = async () => {
    if (!isAdmin) return
    
    const newStudent = {
      id: Date.now(),
      name: "New Developer",
      role: "Developer",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
      bio: "Add a bio here",
      skills: ["Skill 1"],
      github: "https://github.com",
      linkedin: "https://linkedin.com",
      portfolio: "https://portfolio.com",
      email: "email@example.com"
    }
    
    const updatedStudents = [...students, newStudent]
    setStudents(updatedStudents)
    await saveDeveloperData(updatedStudents)
  }

  // Remove student
  const removeStudent = async (studentId) => {
    if (!isAdmin) return
    
    if (!window.confirm('Are you sure you want to remove this developer?')) {
      return
    }
    
    const updatedStudents = students.filter(s => s.id !== studentId)
    setStudents(updatedStudents)
    await saveDeveloperData(updatedStudents)
  }

  // Upload image to Supabase Storage
  const uploadImageToStorage = async (file) => {
    try {
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('You must be logged in to upload files. Please sign in and try again.')
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `developers/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      
      // Use correct bucket name: "eShare"
      const { data, error } = await supabase.storage
        .from('eShare')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        console.error('Error uploading image:', error)
        
        // Provide more helpful error messages
        if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
          throw new Error('Storage bucket "eShare" not found. Please check your Supabase Storage configuration.')
        } else if (error.message?.includes('new row violates row-level security')) {
          throw new Error('Permission denied. Please check your Storage bucket policies.')
        } else if (error.message?.includes('JWT')) {
          throw new Error('Authentication failed. Please sign in again.')
        }
        
        throw error
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('eShare')
        .getPublicUrl(fileName)
      
      return urlData.publicUrl
    } catch (error) {
      console.error('Error uploading to Supabase Storage:', error)
      
      // Return a more user-friendly error message
      if (error.message) {
        throw new Error(error.message)
      }
      
      throw new Error('Failed to upload image. Please check your connection and try again.')
    }
  }

  // Handle image upload
  const handleImageUpload = async (studentId, file) => {
    if (!isAdmin || !file) return
    
    try {
      const imageUrl = await uploadImageToStorage(file)
      
      const updatedStudents = students.map(student => {
        if (student.id === studentId) {
          return { ...student, image: imageUrl }
        }
        return student
      })
      
      setStudents(updatedStudents)
      await saveDeveloperData(updatedStudents)
      
      alert('✅ Image uploaded successfully!')
    } catch (error) {
      console.error('Error uploading image:', error)
      const errorMessage = error.message || 'Failed to upload image. Please try again.'
      alert(`❌ Upload failed: ${errorMessage}`)
    }
  }

  // Start editing a field
  const startEditing = (studentId, field) => {
    if (!isAdmin) return
    setEditingStudent(studentId)
    setEditingField(field)
  }

  // Save edit
  const saveEdit = async (studentId, field, value) => {
    if (!isAdmin) return
    
    const updatedStudents = students.map(student => {
      if (student.id === studentId) {
        if (field === 'skills') {
          // For skills, ensure it's always an array
          const skillsArray = typeof value === 'string' 
            ? value.split(',').map(s => s.trim()).filter(s => s)
            : (Array.isArray(value) ? value : [])
          return { ...student, skills: skillsArray.length > 0 ? skillsArray : ['Skill 1'] }
        }
        if (field.includes('.')) {
          // Handle nested fields
          const [parent, child] = field.split('.')
          return { ...student, [parent]: { ...student[parent], [child]: value } }
        }
        return { ...student, [field]: value }
      }
      // Ensure all students have valid skills arrays
      return {
        ...student,
        skills: ensureSkillsArray(student)
      }
    })
    
    setStudents(updatedStudents)
    setEditingStudent(null)
    setEditingField(null)
    await saveDeveloperData(updatedStudents)
  }

  // Cancel edit
  const cancelEdit = () => {
    setEditingStudent(null)
    setEditingField(null)
  }

  // Editable Text Component
  const EditableText = ({ student, field, children, multiline = false, placeholder = "" }) => {
    const isEditing = isAdmin && editingStudent === student.id && editingField === field
    const value = field === 'skills'
      ? (Array.isArray(student.skills) ? student.skills.join(', ') : (typeof student.skills === 'string' ? student.skills : 'Skill 1'))
      : (field.includes('.') 
          ? student[field.split('.')[0]]?.[field.split('.')[1]] || ''
          : student[field] || '')

    if (isEditing) {
      return (
        <div style={{ position: 'relative' }}>
          {multiline ? (
            <textarea
              defaultValue={value}
              onBlur={(e) => {
                const newValue = e.target.value
                saveEdit(student.id, field, newValue)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  saveEdit(student.id, field, e.target.value)
                }
                if (e.key === 'Escape') {
                  cancelEdit()
                }
              }}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '8px',
                border: '2px solid #3b82f6',
                background: darkMode ? '#1e293b' : 'white',
                color: darkMode ? 'white' : '#334155',
                minHeight: multiline ? '80px' : 'auto',
                resize: 'vertical',
                fontSize: 'inherit',
                fontFamily: 'inherit'
              }}
              placeholder={placeholder}
              autoFocus
            />
          ) : (
            <input
              type="text"
              defaultValue={value}
              onBlur={(e) => {
                saveEdit(student.id, field, e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveEdit(student.id, field, e.target.value)
                }
                if (e.key === 'Escape') {
                  cancelEdit()
                }
              }}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '8px',
                border: '2px solid #3b82f6',
                background: darkMode ? '#1e293b' : 'white',
                color: darkMode ? 'white' : '#334155',
                fontSize: 'inherit',
                fontFamily: 'inherit'
              }}
              placeholder={placeholder}
              autoFocus
            />
          )}
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <button
              onClick={(e) => {
                const input = e.target.parentElement.previousElementSibling.querySelector('input, textarea')
                saveEdit(student.id, field, input.value)
              }}
              style={{
                padding: '4px 12px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
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
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )
    }

    return (
      <div
        onClick={() => isAdmin && startEditing(student.id, field)}
        style={{ 
          cursor: isAdmin ? 'pointer' : 'default',
          position: 'relative',
          border: isAdmin ? '2px dashed transparent' : 'none',
          borderRadius: '4px',
          padding: isAdmin ? '4px' : '0',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          if (isAdmin) {
            e.currentTarget.style.borderColor = '#3b82f6'
            e.currentTarget.style.background = darkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)'
          }
        }}
        onMouseLeave={(e) => {
          if (isAdmin) {
            e.currentTarget.style.borderColor = 'transparent'
            e.currentTarget.style.background = 'transparent'
          }
        }}
      >
        {children}
        {isAdmin && (
          <EditIcon 
            style={{ 
              position: 'absolute', 
              top: '4px', 
              right: '4px', 
              fontSize: '14px', 
              opacity: 0.5,
              color: '#3b82f6'
            }} 
          />
        )}
      </div>
    )
  }

  const StudentCard = ({ student }) => {
    const [isHovered, setIsHovered] = useState(false)

    if (loading) {
      return (
        <div style={{
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          background: darkMode ? '#374151' : '#f9fafb',
          color: darkMode ? 'white' : '#1f2937'
        }}>
          Loading...
        </div>
      )
    }

    return (
      <div 
        style={{
          borderRadius: '16px',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          background: darkMode 
            ? 'linear-gradient(135deg, #374151, #1f2937)' 
            : 'linear-gradient(135deg, #ffffff, #f9fafb)',
          border: darkMode ? '1px solid #4b5563' : '1px solid #e5e7eb',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          position: 'relative'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isAdmin && (
          <button
            onClick={() => removeStudent(student.id)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 1)'
              e.currentTarget.style.transform = 'scale(1.15)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)'
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'
            }}
            title="Remove Developer"
          >
            <CloseIcon fontSize="small" />
          </button>
        )}
        {/* Student Image */}
        <div style={{ position: 'relative', height: '192px', overflow: 'hidden' }}>
          <img 
            src={student.image} 
            alt={student.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.7s ease',
              transform: isHovered ? 'scale(1.1)' : 'scale(1)'
            }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: darkMode 
              ? 'linear-gradient(to top, rgba(31,41,55,0.8), transparent)' 
              : 'linear-gradient(to top, rgba(31,41,55,0.6), transparent)'
          }}></div>
          {isAdmin && (
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              right: '8px',
              display: 'flex',
              gap: '8px',
              opacity: isHovered ? 1 : 0.7,
              transition: 'opacity 0.3s ease'
            }}>
              {/* Upload Image Button */}
              <label
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(59, 130, 246, 0.9)',
                  color: 'white',
                  fontSize: '11px',
                  textAlign: 'center',
                  backdropFilter: 'blur(4px)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 1)'
                  e.currentTarget.style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.9)'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <CloudUploadIcon sx={{ fontSize: '14px' }} />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) {
                      handleImageUpload(student.id, file)
                    }
                    e.target.value = ''
                  }}
                  style={{ display: 'none' }}
                />
              </label>
              
              {/* Edit URL Button */}
              <EditableText student={student} field="image" placeholder="Image URL">
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  fontSize: '11px',
                  textAlign: 'center',
                  backdropFilter: 'blur(4px)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.9)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.7)'
                }}
                >
                  <EditIcon sx={{ fontSize: '14px' }} />
                  URL
                </div>
              </EditableText>
            </div>
          )}
        </div>

        {/* Student Info */}
        <div style={{ padding: '24px' }}>
          <EditableText student={student} field="name">
          <h3 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: darkMode ? 'white' : '#1f2937'
          }}>
            {student.name}
          </h3>
          </EditableText>
          
          <EditableText student={student} field="role">
          <p style={{
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '12px',
            color: darkMode ? '#60a5fa' : '#2563eb'
          }}>
            {student.role}
          </p>
          </EditableText>

          <EditableText student={student} field="bio" multiline>
          <p style={{
            fontSize: '14px',
            marginBottom: '16px',
            lineHeight: '1.6',
            color: darkMode ? '#d1d5db' : '#6b7280'
          }}>
            {student.bio}
          </p>
          </EditableText>

          {/* Skills */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px',
              color: darkMode ? '#d1d5db' : '#374151'
            }}>
              🛠 Technologies:
            </h4>
            <EditableText student={student} field="skills" placeholder="React, JavaScript, CSS">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(Array.isArray(student.skills) ? student.skills : []).map((skill, index) => (
                <span
                  key={index}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    borderRadius: '9999px',
                    fontWeight: '500',
                    transition: 'all 0.3s ease',
                    background: darkMode ? '#374151' : '#dbeafe',
                    color: darkMode ? '#d1d5db' : '#1e40af',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = darkMode ? '#3b82f6' : '#3b82f6'
                    e.target.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = darkMode ? '#374151' : '#dbeafe'
                    e.target.style.color = darkMode ? '#d1d5db' : '#1e40af'
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
            </EditableText>
          </div>

          {/* Social Links */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            paddingTop: '16px',
            borderTop: darkMode ? '1px solid #4b5563' : '1px solid #e5e7eb',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {[
              { 
                field: 'github',
                href: student.github, 
                icon: <GitHubIcon />,
                label: 'GitHub',
                color: darkMode ? '#374151' : '#e5e7eb',
                hoverColor: '#1f2937'
              },
              { 
                field: 'linkedin',
                href: student.linkedin, 
                icon: <LinkedInIcon />,
                label: 'LinkedIn',
                color: darkMode ? '#374151' : '#e5e7eb',
                hoverColor: '#0a66c2'
              },
              { 
                field: 'portfolio',
                href: student.portfolio, 
                icon: <PortfolioIcon />,
                label: 'Portfolio',
                color: darkMode ? '#374151' : '#e5e7eb',
                hoverColor: '#059669'
              },
              { 
                field: 'email',
                href: `mailto:${student.email}`, 
                icon: <EmailIcon />,
                label: 'Email',
                color: darkMode ? '#374151' : '#e5e7eb',
                hoverColor: '#dc2626'
              }
            ].map((social, index) => {
              return (
                <div key={index} style={{ position: 'relative' }}>
                  <EditableText 
                    student={student} 
                    field={social.field}
                    placeholder={`https://${social.field}.com/username`}
                  >
                    {student[social.field] && student[social.field].trim() !== '' ? (
                      <a
                        href={social.field === 'email' ? `mailto:${student[social.field]}` : student[social.field]}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (isAdmin && editingStudent === student.id && editingField === social.field) {
                            e.preventDefault()
                          }
                        }}
                        style={{
                          padding: '12px',
                          borderRadius: '9999px',
                          transition: 'all 0.3s ease',
                          background: social.color,
                          color: darkMode ? '#d1d5db' : '#374151',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '40px',
                          height: '40px',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          if (!(isAdmin && editingStudent === student.id && editingField === social.field)) {
                            e.currentTarget.style.background = social.hoverColor
                            e.currentTarget.style.color = 'white'
                            e.currentTarget.style.transform = 'scale(1.1)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = social.color
                          e.currentTarget.style.color = darkMode ? '#d1d5db' : '#374151'
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                        title={social.label}
                      >
                        {social.icon}
                      </a>
                    ) : (
                      <div
                        style={{
                          padding: '12px',
                          borderRadius: '9999px',
                          transition: 'all 0.3s ease',
                          background: darkMode ? '#374151' : '#e5e7eb',
                          color: darkMode ? '#6b7280' : '#9ca3af',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '40px',
                          height: '40px',
                          position: 'relative',
                          opacity: 0.5,
                          cursor: isAdmin ? 'pointer' : 'default'
                        }}
                        onClick={() => {
                          if (isAdmin) {
                            // Trigger edit mode for this field
                            setEditingStudent(student.id)
                            setEditingField(social.field)
                            // Focus on the input
                            setTimeout(() => {
                              const input = document.querySelector(`input[data-field="${social.field}"][data-student-id="${student.id}"]`)
                              if (input) {
                                input.focus()
                                input.select()
                              }
                            }, 100)
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (isAdmin) {
                            e.currentTarget.style.opacity = '1'
                            e.currentTarget.style.background = darkMode ? '#4b5563' : '#d1d5db'
                            e.currentTarget.style.transform = 'scale(1.1)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '0.5'
                          e.currentTarget.style.background = darkMode ? '#374151' : '#e5e7eb'
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                        title={isAdmin ? `Click to add ${social.label} link` : `${social.label} not set`}
                      >
                        {social.icon}
                      </div>
                    )}
                  </EditableText>
                  {isAdmin && student[social.field] && student[social.field].trim() !== '' && (
                    <button
                      onClick={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        
                        if (window.confirm(`Are you sure you want to remove the ${social.label} link?`)) {
                          try {
                            const updatedStudents = students.map(s => {
                              if (s.id === student.id) {
                                return { ...s, [social.field]: '' }
                              }
                              return s
                            })
                            setStudents(updatedStudents)
                            await saveDeveloperData(updatedStudents)
                            console.log(`Removed ${social.label} link for ${student.name}`)
                          } catch (error) {
                            console.error('Error removing social link:', error)
                            alert('Failed to remove social link. Please try again.')
                          }
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100,
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        padding: 0,
                        pointerEvents: 'auto'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 1)'
                        e.currentTarget.style.transform = 'scale(1.2)'
                        e.currentTarget.style.boxShadow = '0 4px 10px rgba(239, 68, 68, 0.4)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)'
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)'
                      }}
                      title={`Remove ${social.label}`}
                    >
                      <CloseIcon sx={{ fontSize: '14px' }} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{styles}</style>
      <div className={darkMode ? 'dark' : 'light'} style={{ minHeight: '100vh' }}>
        {/* Header */}
        <header style={{
          padding: '24px 16px',
          background: darkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              DevPortfolio
            </h1>
            {isAdmin && (
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  background: '#10b981',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  🔓 Admin Mode
                </div>
            <button
                  onClick={addStudent}
              style={{
                    padding: '10px 20px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)'
                    e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
                  <AddIcon sx={{ fontSize: '20px' }} />
                  Add Developer
            </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '32px 16px'
        }}>
          {/* Students Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px'
          }}>
            {students.map(student => (
              <StudentCard key={student.id} student={student} />
            ))}
            
            {/* Add New Developer Card (Admin Only) */}
            {isAdmin && (
              <div
                onClick={addStudent}
                style={{
                  borderRadius: '16px',
                  border: `2px dashed ${darkMode ? '#4b5563' : '#cbd5e1'}`,
                  background: darkMode 
                    ? 'rgba(59, 130, 246, 0.1)' 
                    : 'rgba(59, 130, 246, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '400px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  gap: '16px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = darkMode ? '#3b82f6' : '#3b82f6'
                  e.currentTarget.style.background = darkMode 
                    ? 'rgba(59, 130, 246, 0.2)' 
                    : 'rgba(59, 130, 246, 0.1)'
                  e.currentTarget.style.transform = 'scale(1.02)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = darkMode ? '#4b5563' : '#cbd5e1'
                  e.currentTarget.style.background = darkMode 
                    ? 'rgba(59, 130, 246, 0.1)' 
                    : 'rgba(59, 130, 246, 0.05)'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '40px',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}>
                  <AddIcon sx={{ fontSize: '48px' }} />
          </div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: darkMode ? '#e2e8f0' : '#1e293b',
                  margin: 0
                }}>
                  Add New Developer
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: darkMode ? '#94a3b8' : '#64748b',
            textAlign: 'center',
                  margin: 0
                }}>
                  Click to add a new developer profile
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}

export default Devloper
