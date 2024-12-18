'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload, Home, Loader2, Save, Check, Trash2, X, Info } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import '../styles/dashboard.css'
import { useUser } from './UserContext.js'; // Import the useUser hook
import { useDropzone } from 'react-dropzone';

function InfoTooltip({ content }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="info-icon" />
        </TooltipTrigger>
        <TooltipContent>
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default function Dashboard() {
  // Control Panel
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [styleStrength, setStyleStrength] = useState(50)
  const [selectedModel, setSelectedModel] = useState('Select Model')

  // Create Model Modal
  const [modelName, setModelName] = useState(''); // State for model name
  const [modelNameError, setModelNameError] = useState(''); // State for model name error

  // Image window
  const [generatedImages, setGeneratedImages] = useState([])
  const [savedImages, setSavedImages] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [numImages, setNumImages] = useState(1)
  const [loadingImages, setLoadingImages] = useState([])
  const generateButtonRef = useRef(null)
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false)
  const { user } = useUser(); // Use the useUser hook to get user and setUser
  const [isCreateModelModalOpen, setIsCreateModelModalOpen] = useState(false)
  const [models, setModels] = useState([])

  // Load models and generated images from user data
  useEffect(() => {
    if (user && user.data && user.data.models) {
      const userModels = user.data.models;
      setModels(userModels);

      const newGeneratedImages = [];
      const newSavedImages = [];
      userModels.forEach((model) => {
        if (model.generatedURLs) {
          for (let i = 0; i < model.generatedURLs.length; i += 2) {
            const url = model.generatedURLs[i];
            const isSaved = model.generatedURLs[i + 1];
            const image = {
              id: `${model.name}-${Date.now()}-${Math.random()}`,
              url: url,
              isSaved: isSaved,
              model: model.name
            };
            newGeneratedImages.push(image);
            if (isSaved) {
              newSavedImages.push(image);
            }
          }
        }
      });
      setGeneratedImages(newGeneratedImages);
      setSavedImages(newSavedImages);
    }
  }, [user]);

  const handleGenerate = () => {
    setIsGenerating(true)
    const placeholders = Array(numImages).fill(null).map((_, index) =>
      `/placeholder.svg?height=200&width=200&text=Generating ${index + 1}`
    )
    setLoadingImages(placeholders)

    setTimeout(() => {
      const newImages = Array(numImages).fill(null).map((_, index) => ({
        id: `${selectedModel}-${Date.now()}-${index}`,
        url: `/placeholder.svg?height=200&width=200&text=${encodeURIComponent(prompt)}`,
        isSaved: false,
        model: selectedModel
      }))
      setGeneratedImages(prev => [...newImages, ...prev])
      setLoadingImages([])
      setIsGenerating(false)
    }, 3000)
  }

  const handleSave = (image) => {
    if (!image.isSaved) {
      const updatedImage = { ...image, isSaved: true }
      setGeneratedImages(prev => prev.map(img => img.id === image.id ? updatedImage : img))
      setSavedImages(prev => [updatedImage, ...prev])
    }
  }

  const handleRemove = (image) => {
    setSavedImages(prev => prev.filter(img => img.id !== image.id))
    setGeneratedImages(prev => prev.map(img => img.id === image.id ? { ...img, isSaved: false } : img))
  }

  const handleModelSelect = (modelName) => {
    setSelectedModel(modelName)
    setIsModelDialogOpen(false)
  }

 const handleCreateModel = (newModel) => {
    setModels(prev => [...prev, newModel])
    setSelectedModel(newModel.name)
  }

  const handleModelRemove = (modelId) => {
    setModels(prev => prev.filter(model => model.id !== modelId))
    if (selectedModel === models.find(model => model.id === modelId)?.name) {
      setSelectedModel('Default Model')
    }
  }

  const groupImagesByModel = (images) => {
    const groups = {}
    images.forEach(image => {
      if (!groups[image.model]) {
        groups[image.model] = []
      }
      groups[image.model].push(image)
    })
    return Object.entries(groups)
  }

  // Drag and drop files
  const [files, setFiles] = useState([]);
  const [isSubmitted, setisSubmitted] = useState(false);

  const onDrop = (acceptedFiles) => {
    setFiles(acceptedFiles);
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  const validateModelName = (name) => {
    const isValidName = /^[a-zA-Z0-9 ]+$/.test(name);
    if (!isValidName) {
      setModelNameError('Name must contain only letters and numbers');
      return false;
    }
    setModelNameError('');
    return true;
  };

  const handleStartTraining = async () => {
    if (!validateModelName(modelName)) {
      return;
    }

    const formData = new FormData();
    formData.append('name', modelName);
    formData.append('uid', user.uid);
    if (files.length < 10) {
      setModelNameError('Must have at least 10 images');
      return;
    } else if (files.length > 20) {
      setModelNameError('Too many images (20 max)');
      return;
    }
    files.forEach((file, index) => {
      formData.append(`filesList[${index}]`, file);
    });

    try {
      const response = await fetch('/api/training', {
        method: 'POST',
        body: formData,
      });
      console.log(response)
      if (response.ok) {
        // Handle successful response
        console.log('Model training started successfully');
        setIsCreateModelModalOpen(false);
      } else {
        // Handle error response
        console.error(`Error from training route`);
      }
    } catch (error) {
      console.error('An unexpected error occurred:', error);
    }
  };

  return (
    <div className="dashboard">
      <div className="main-content">
        <aside className="sidebar">
          <Card className="sidebar-card">
            <CardContent className="sidebar-content">
               <h2 className='sidebar-title'>Choose Your Model</h2>

              <Dialog open={isModelDialogOpen} onOpenChange={setIsModelDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="model-select-button">
                    <Home className="model-icon" />
                    {selectedModel}
                  </Button>
                </DialogTrigger>
                <DialogContent className="model-dialog">
                  <DialogHeader>
                    <DialogTitle>Select or Create Model</DialogTitle>
                  </DialogHeader>
                  <div className="model-list">
                    {models.map((model) => (
                      <div key={model.id} className="model-item">
                        <img
                          src={model.image}
                          alt={model.name}
                          className="model-image"
                        />
                        <Button onClick={() => handleModelSelect(model.name)} className="model-select-overlay">
                          {model.name}
                        </Button>

                          {/* Alert for deleting a model */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon" className="model-delete-button">
                                <X className="delete-icon" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure you want to delete this model?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the model and remove it from our servers.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleModelRemove(model.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </div>
                    ))}
                  </div>

                  <Button onClick={() => {
                    setIsCreateModelModalOpen(true);
                    setIsModelDialogOpen(false);
                    }} className="upload-button">
                    Create New Model
                  </Button>
                </DialogContent>
              </Dialog>

              {/* Create Model modal */}
              {isCreateModelModalOpen && (
                <div className='modal-background'>
                  <div className="modal">
                    <div className="modal-content">
                      <div className='modal-buttons'>
                        <button onClick={() => {
                          setIsModelDialogOpen(true);
                          setIsCreateModelModalOpen(false);
                          }} className="close-button">&larr; back</button>
                        <button onClick={() => setIsCreateModelModalOpen(false)} className="close-button">close</button>
                      </div>

                      <h2>Create Your Own AI Model</h2>
                      <p>Upload 10-20 images of your home</p>
                      <div className="create-model-form">
                        <div>
                          <label htmlFor="model-name">Model Name: </label>
                          <input
                            id="model-name"
                            type="text"
                            placeholder="Enter model name"
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                            onBlur={() => validateModelName(modelName)}
                            required
                          />
                          {modelNameError && <p className="error">{modelNameError}</p>}
                        </div>
                        <div {...getRootProps({ className: 'dropzone' })}>
                          <input {...getInputProps()} />
                          <p className='drag-n-drop-zone'><Upload className="upload-icon-drag-zone" />Drag 'n' drop or click to select files</p>
                          <ul>
                            {files.map((file) => (
                              <li key={file.path}>{file.path}</li>
                            ))}
                          </ul>
                        </div>
                        {isSubmitted ? (
                          <p>Form Submitted</p>
                        ):(
                          <button className='create-model-form-button' onClick={handleStartTraining}>Start Training<Upload className="upload-icon"/></button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <h2 className='sidebar-title'>Craft Your Prompt</h2>
                <label htmlFor="prompt" className="input-label">
                  Prompt
                  <InfoTooltip content="Describe the image you want to generate in detail." />
                </label>
                <Input
                  id="prompt"
                  placeholder="Enter your prompt here"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="negative-prompt" className="input-label">
                  Negative Prompt
                  <InfoTooltip content="Describe what you don't want in the image." />
                </label>
                <Input
                  id="negative-prompt"
                  placeholder="Enter negative prompt here"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="num-images" className="input-label">
                  Number of Images: {numImages}
                  <InfoTooltip content="Choose how many images to generate at once." />
                </label>
                <Slider
                  id="num-images"
                  min={1}
                  max={10}
                  step={1}
                  value={[numImages]}
                  onValueChange={(value) => setNumImages(value[0])}
                />
              </div>

              <div className="form-group">
                <label htmlFor="style-strength" className="input-label">
                  Style Strength: {styleStrength}%
                  <InfoTooltip content="Adjust how strongly the AI applies the style to the image." />
                </label>
                <Slider
                  id="style-strength"
                  min={0}
                  max={100}
                  step={1}
                  value={[styleStrength]}
                  onValueChange={(value) => setStyleStrength(value[0])}
                />
              </div>

              <div className="generate-button-container">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt}
                  className="generate-button"
                  ref={generateButtonRef}
                >
                  {isGenerating ? 'Generating...' : 'Generate'}
                </Button>
                {isGenerating && (
                  <motion.div
                    className="generate-progress"
                    animate={{
                      x: ['0%', '100%'],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: 'linear',
                    }}
                  />
                )}
              </div>

              <div className="prompt-tips">
                <p>Tips for great prompts:</p>
                <ul>
                  <li>Be specific and descriptive</li>
                  <li>Mention art styles or artists for inspiration</li>
                  <li>Include details about lighting and mood</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className="main-area">
          <Tabs defaultValue="generated" className="image-tabs">
            <TabsList className="tabs-list">
              <TabsTrigger value="generated">Generated Images</TabsTrigger>
              <TabsTrigger value="saved">Saved Images</TabsTrigger>
            </TabsList>
            <TabsContent value="generated">
              <div className="image-grid">
                <AnimatePresence>
                  {loadingImages.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="loading-images"
                    >
                      {loadingImages.map((image, index) => (
                        <Card key={`loading-${index}`} className="image-card loading">
                          <CardContent className="image-content">
                            <div className="image-wrapper">
                              <img src={image} alt={`Generating ${index + 1}`} className="generating-image" />
                              <div className="loading-overlay">
                                <Loader2 className="loading-icon" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                {groupImagesByModel(generatedImages).map(([model, images]) => (
                  <div key={model} className="model-group">
                    <h3 className="model-title">{model}</h3>
                    <div className="image-list">
                      {images.map((image) => (
                        <motion.div
                          key={image.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                          className="image-item"
                        >
                          <Card className="image-card">
                            <CardContent className="image-content">
                              <motion.img
                                src={image.url}
                                alt={`Generated ${image.id}`}
                                className="generated-image"
                                whileHover={{ filter: "blur(2px)" }}
                              />
                              <motion.div
                                className="image-overlay"
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 1 }}
                              >
                                <Button
                                  onClick={() => handleSave(image)}
                                  variant="secondary"
                                  size="icon"
                                  className="save-button"
                                >
                                  {image.isSaved ? (
                                    <Check className="save-icon saved" />
                                  ) : (
                                    <Save className="save-icon" />
                                  )}
                                </Button>
                              </motion.div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="saved">
              <div className="image-grid">
                {groupImagesByModel(savedImages).map(([model, images]) => (
                  <div key={model} className="model-group">
                    <h3 className="model-title">{model}</h3>
                    <div className="image-list">
                      {images.map((image) => (
                        <motion.div
                          key={image.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                          className="image-item"
                        >
                          <Card className="image-card">
                            <CardContent className="image-content">
                              <motion.img
                                src={image.url}
                                alt={`Saved ${image.id}`}
                                className="saved-image"
                                whileHover={{ filter: "blur(2px)" }}
                              />
                              <motion.div
                                className="image-overlay"
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 1 }}
                              >
                                <Button
                                  onClick={() => handleRemove(image)}
                                  variant="destructive"
                                  size="icon"
                                  className="remove-button"
                                >
                                  <Trash2 className="remove-icon" />
                                </Button>
                              </motion.div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
