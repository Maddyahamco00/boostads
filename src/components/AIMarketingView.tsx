import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Tag, 
  Wand2, 
  RefreshCw, 
  Film, 
  LayoutGrid, 
  Video, 
  Megaphone,
  ArrowRight 
} from 'lucide-react';
import { 
  AIMarketingResponse, 
  AIMarketingRequest,
  AIVideoConceptResponse,
  ImageAdConcept
} from '../types';

export const AIMarketingView: React.FC = () => {
  const { currentUser, businesses, currentLocation, setActiveView } = useApp();

  const userBiz = businesses.find(b => b.ownerId === currentUser.id) || businesses[0];

  const [activeSubTab, setActiveSubTab] = useState<'copywriting' | 'video_storyboard' | 'image_concepts'>('copywriting');

  // Copywriting form
  const [formData, setFormData] = useState<AIMarketingRequest>({
    businessName: userBiz ? userBiz.name : 'Boost Market Merchant',
    productOrService: 'Handcrafted Northern Leather Shoes & Boots',
    businessCategory: userBiz ? userBiz.categoryLabel : 'Fashion & Apparel',
    targetAudience: 'Professionals and executives',
    location: currentLocation.city ? `${currentLocation.city}, Nigeria` : 'Kaduna, Nigeria',
    tone: 'catchy_promotional',
    customInstructions: 'Emphasize durability, comfort, and fast delivery.'
  });

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedData, setGeneratedData] = useState<AIMarketingResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Video Storyboard state
  const [videoPrompt, setVideoPrompt] = useState({
    businessName: userBiz ? userBiz.name : 'Boost Market Merchant',
    productOrService: 'Custom bespoke Senator & Agbada tailoring with 48-hour delivery',
    targetPlatform: 'tiktok' as 'tiktok' | 'instagram_reels' | 'youtube_shorts',
    durationSeconds: 30
  });
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [videoStoryboard, setVideoStoryboard] = useState<AIVideoConceptResponse | null>(null);

  // Image Concepts state
  const [isImgGenLoading, setIsImgGenLoading] = useState(false);
  const [imageConcepts, setImageConcepts] = useState<ImageAdConcept[]>([]);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.productOrService) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success && data.data) {
        setGeneratedData(data.data);
      }
    } catch (err) {
      console.error('Failed to generate marketing content:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideoStoryboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVideoGenerating(true);
    try {
      const res = await fetch('/api/ai/video-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoPrompt)
      });
      const data = await res.json();
      if (data.success && data.storyboard) {
        setVideoStoryboard(data.storyboard);
      }
    } catch (err) {
      console.error('Failed to generate video storyboard:', err);
    } finally {
      setIsVideoGenerating(false);
    }
  };

  const handleGenerateImageConcepts = async () => {
    setIsImgGenLoading(true);
    try {
      const res = await fetch('/api/ai/image-ad-concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: userBiz?.name || 'Boost Market Merchant',
          productOrService: formData.productOrService,
          category: userBiz?.categoryLabel || 'Retail',
          targetCities: [currentLocation.city || 'Kaduna', 'Abuja']
        })
      });
      const data = await res.json();
      if (data.success && data.concepts) {
        setImageConcepts(data.concepts);
      }
    } catch (err) {
      console.error('Failed to generate image concepts:', err);
    } finally {
      setIsImgGenLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div id="ai-marketing-view" className="min-h-screen bg-gray-50 pb-20 text-gray-900">
      {/* Header Banner */}
      <div className="border-b border-gray-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Marketing Studio
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Generate ad copy, video scripts, and visual concepts for your business.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('campaigns')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Campaigns</span>
              </button>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-2 mt-4 border-t border-gray-100 pt-3">
            <button
              onClick={() => setActiveSubTab('copywriting')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeSubTab === 'copywriting'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Copywriting</span>
            </button>

            <button
              onClick={() => setActiveSubTab('video_storyboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeSubTab === 'video_storyboard'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Video Scripts</span>
            </button>

            <button
              onClick={() => {
                setActiveSubTab('image_concepts');
                if (imageConcepts.length === 0) handleGenerateImageConcepts();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeSubTab === 'image_concepts'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Ad Layouts</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: COPYWRITING STUDIO */}
      {activeSubTab === 'copywriting' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center gap-1.5 pb-3 border-b border-gray-100 mb-4">
                  <Wand2 className="w-4 h-4 text-blue-600" />
                  <h2 className="font-bold text-gray-900 text-sm">Campaign Parameters</h2>
                </div>

                <form onSubmit={handleGenerate} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Business Name</label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Product or Service</label>
                    <textarea
                      rows={2}
                      required
                      value={formData.productOrService}
                      onChange={(e) => setFormData({ ...formData, productOrService: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Category</label>
                      <input
                        type="text"
                        value={formData.businessCategory}
                        onChange={(e) => setFormData({ ...formData, businessCategory: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Tone</label>
                    <select
                      value={formData.tone}
                      onChange={(e) => setFormData({ ...formData, tone: e.target.value as any })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:outline-none focus:border-blue-600"
                    >
                      <option value="catchy_promotional">Catchy & High Conversion</option>
                      <option value="professional_trustworthy">Professional & Trustworthy</option>
                      <option value="urgent_discount">Urgent Discount</option>
                      <option value="storytelling">Brand Storytelling</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate Copy</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-7">
              {!generatedData ? (
                <div className="h-full min-h-[300px] border border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-white">
                  <Sparkles className="w-8 h-8 text-gray-300 mb-2" />
                  <h3 className="text-sm font-bold text-gray-900">No Content Generated</h3>
                  <p className="text-xs text-gray-500 max-w-xs mt-1 mb-4">
                    Fill in your product details on the left and click Generate.
                  </p>
                  <button
                    onClick={() => handleGenerate()}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
                  >
                    Generate Sample
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Headlines */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-blue-600" />
                      <span>Headlines ({generatedData.headlines.length})</span>
                    </h3>
                    <div className="space-y-1.5">
                      {generatedData.headlines.map((hl, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-900">{hl}</span>
                          <button
                            onClick={() => copyToClipboard(hl, `hl_${idx}`)}
                            className="p-1 rounded text-gray-400 hover:text-gray-700 cursor-pointer"
                          >
                            {copiedKey === `hl_${idx}` ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Body & CTA */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ad Copy</h3>
                      <button
                        onClick={() => copyToClipboard(generatedData.description, 'body')}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'body' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 leading-relaxed whitespace-pre-line">
                      {generatedData.description}
                    </div>

                    <div className="mt-2.5 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-blue-700 font-medium uppercase block">Call To Action</span>
                        <span className="text-xs font-bold text-gray-900">{generatedData.callToAction}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(generatedData.callToAction, 'cta')}
                        className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                      >
                        {copiedKey === 'cta' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Social Captions */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                      Social Captions
                    </h3>
                    <div className="space-y-2.5">
                      {generatedData.socialCaptions.map((soc, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-blue-600">{soc.platform}</span>
                            <button
                              onClick={() => copyToClipboard(`${soc.text}\n\n${soc.hashtags.join(' ')}`, `soc_${idx}`)}
                              className="text-xs text-blue-600 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedKey === `soc_${idx}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                              <span>Copy</span>
                            </button>
                          </div>
                          <p className="text-gray-700 leading-relaxed">{soc.text}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {soc.hashtags.map((h, i) => (
                              <span key={i} className="text-[10px] text-gray-500 font-medium">{h}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VIDEO STORYBOARD STUDIO */}
      {activeSubTab === 'video_storyboard' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center gap-1.5 pb-3 border-b border-gray-100 mb-3">
                  <Film className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-gray-900 text-sm">Video Parameters</h3>
                </div>

                <form onSubmit={handleGenerateVideoStoryboard} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Business Name</label>
                    <input
                      type="text"
                      value={videoPrompt.businessName}
                      onChange={(e) => setVideoPrompt({ ...videoPrompt, businessName: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Core Message</label>
                    <textarea
                      rows={2}
                      value={videoPrompt.productOrService}
                      onChange={(e) => setVideoPrompt({ ...videoPrompt, productOrService: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Platform</label>
                    <select
                      value={videoPrompt.targetPlatform}
                      onChange={(e) => setVideoPrompt({ ...videoPrompt, targetPlatform: e.target.value as any })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:outline-none focus:border-blue-600"
                    >
                      <option value="tiktok">TikTok 9:16</option>
                      <option value="instagram_reels">Instagram Reels</option>
                      <option value="youtube_shorts">YouTube Shorts</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isVideoGenerating}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isVideoGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Film className="w-3.5 h-3.5" />
                        <span>Generate Script</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-8">
              {!videoStoryboard ? (
                <div className="h-full min-h-[300px] border border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-white">
                  <Video className="w-8 h-8 text-gray-300 mb-2" />
                  <h4 className="font-bold text-gray-900 text-sm">No Storyboard Generated</h4>
                  <p className="text-xs text-gray-500 max-w-xs mt-1">
                    Generate scene directions, voiceover script, and hooks.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">{videoStoryboard.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{videoStoryboard.conceptOverview}</p>
                      </div>
                      <span className="text-xs font-semibold text-blue-600">{videoStoryboard.estimatedDurationSeconds}s</span>
                    </div>

                    <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 mt-3 text-xs">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase block mb-0.5">Hook</span>
                      <span className="text-gray-900 font-medium italic">"{videoStoryboard.hook}"</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {videoStoryboard.scenes.map((scene) => (
                      <div key={scene.sceneNumber} className="bg-white border border-gray-200 rounded-xl p-3.5 text-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2 font-medium">
                          <span className="text-gray-900">Scene {scene.sceneNumber} ({scene.durationSeconds}s)</span>
                          <span className="text-gray-500">{scene.cameraAngle}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-medium text-gray-400 uppercase block">Action</span>
                            <p className="text-gray-700">{scene.visualDescription}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-medium text-gray-400 uppercase block">Voiceover</span>
                            <p className="text-gray-900 italic">"{scene.voiceoverScript}"</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: IMAGE CONCEPTS */}
      {activeSubTab === 'image_concepts' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Visual Display Concepts</h3>
              <p className="text-xs text-gray-500">Banner and display concepts for multi-platform campaigns.</p>
            </div>

            <button
              onClick={handleGenerateImageConcepts}
              disabled={isImgGenLoading}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isImgGenLoading ? 'animate-spin' : ''}`} />
              <span>Regenerate</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {imageConcepts.map((concept) => (
              <div key={concept.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex flex-col justify-between text-xs">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
                    <span className="text-[10px] font-semibold text-blue-600 uppercase">
                      {concept.aspectRatio}
                    </span>
                    <span className="text-[10px] text-gray-500">{concept.format}</span>
                  </div>

                  <h4 className="font-bold text-gray-900 mb-1">{concept.title}</h4>
                  <p className="text-gray-600 mb-3">{concept.layoutDescription}</p>

                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 space-y-1 mb-3">
                    <span className="font-semibold text-gray-900 block">{concept.overlayText.headline}</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium text-[10px] inline-block">
                      {concept.overlayText.badge}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveView('campaigns')}
                  className="w-full py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Use in Campaign</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
