import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Rocket, 
  Layers, 
  Instagram, 
  MessageSquare, 
  Twitter, 
  Tag, 
  Wand2, 
  RefreshCw, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Image as ImageIcon,
  Video,
  Film,
  Music,
  Clapperboard,
  LayoutGrid,
  Send,
  Eye,
  Megaphone
} from 'lucide-react';
import { 
  AIMarketingResponse, 
  AIMarketingRequest,
  AIVideoConceptResponse,
  ImageAdConcept
} from '../types';

export const AIMarketingView: React.FC = () => {
  const { currentUser, businesses, currentLocation, setIsCreateAdModalOpen, setActiveView } = useApp();

  const userBiz = businesses.find(b => b.ownerId === currentUser.id) || businesses[0];

  const [activeSubTab, setActiveSubTab] = useState<'copywriting' | 'video_storyboard' | 'image_concepts'>('copywriting');

  // Copywriting form
  const [formData, setFormData] = useState<AIMarketingRequest>({
    businessName: userBiz ? userBiz.name : 'Real Boosters Merchant',
    productOrService: 'Handcrafted Northern Leather Shoes & Boots',
    businessCategory: userBiz ? userBiz.categoryLabel : 'Fashion & Apparel',
    targetAudience: 'Young professionals, civil servants, and business executives',
    location: currentLocation.city ? `${currentLocation.city}, Nigeria` : 'Kaduna, Nigeria',
    tone: 'catchy_promotional',
    customInstructions: 'Emphasize durability, comfort, express nationwide DHL delivery, and instant Flutterwave payment.'
  });

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedData, setGeneratedData] = useState<AIMarketingResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Video Storyboard state
  const [videoPrompt, setVideoPrompt] = useState({
    businessName: userBiz ? userBiz.name : 'Real Boosters Fashion',
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
      console.error('Failed to generate AI marketing content:', err);
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
    <div id="ai-marketing-view" className="min-h-screen bg-slate-950 pb-24 text-slate-100">
      {/* Header Banner */}
      <div className="border-b border-slate-800 bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-950 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Powered by Server-Side Gemini 3.7 Flash Engine</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                AI Advertising & Creative Studio
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                Generate high-converting multi-platform ad copy, viral TikTok/Reels video storyboards, and tailored display ad concepts in seconds.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveView('campaigns')}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-1.5 transition-all"
              >
                <Megaphone className="w-4 h-4" />
                <span>Go to Campaign Hub</span>
              </button>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-3 mt-6 border-t border-slate-800/80 pt-4">
            <button
              onClick={() => setActiveSubTab('copywriting')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeSubTab === 'copywriting'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Copywriting & Headlines</span>
            </button>

            <button
              onClick={() => setActiveSubTab('video_storyboard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeSubTab === 'video_storyboard'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>TikTok / Reels Video Scripts</span>
            </button>

            <button
              onClick={() => {
                setActiveSubTab('image_concepts');
                if (imageConcepts.length === 0) handleGenerateImageConcepts();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeSubTab === 'image_concepts'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Multi-Format Ad Layouts</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: COPYWRITING STUDIO */}
      {activeSubTab === 'copywriting' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-800 mb-6">
                  <Wand2 className="w-5 h-5 text-indigo-400" />
                  <h2 className="font-bold text-white text-base">Campaign Details</h2>
                </div>

                <form onSubmit={handleGenerate} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Business Name</label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Product or Service *</label>
                    <textarea
                      rows={2}
                      required
                      value={formData.productOrService}
                      onChange={(e) => setFormData({ ...formData, productOrService: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Category</label>
                      <input
                        type="text"
                        value={formData.businessCategory}
                        onChange={(e) => setFormData({ ...formData, businessCategory: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Tone & Voice</label>
                    <select
                      value={formData.tone}
                      onChange={(e) => setFormData({ ...formData, tone: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="catchy_promotional">Catchy & High Conversion</option>
                      <option value="professional_trustworthy">Executive & Trustworthy</option>
                      <option value="urgent_discount">Urgent Discount & Flash Sale</option>
                      <option value="storytelling">Inspiring Brand Storytelling</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Key Selling Points</label>
                    <textarea
                      rows={2}
                      value={formData.customInstructions}
                      onChange={(e) => setFormData({ ...formData, customInstructions: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Generating Ad Package...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Complete Copy Package</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-7">
              {!generatedData ? (
                <div className="h-full min-h-[400px] border border-dashed border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-slate-900/30">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-white">Gemini Copywriting Engine Ready</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1 mb-6">
                    Enter your offer details on the left and click Generate to produce headlines, body copy, and social media captions.
                  </p>
                  <button
                    onClick={() => handleGenerate()}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
                  >
                    Generate Sample Copy
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Headlines */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-emerald-400" />
                      <span>Optimized Headlines ({generatedData.headlines.length})</span>
                    </h3>
                    <div className="space-y-2">
                      {generatedData.headlines.map((hl, idx) => (
                        <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between group">
                          <span className="text-xs font-bold text-white">{hl}</span>
                          <button
                            onClick={() => copyToClipboard(hl, `hl_${idx}`)}
                            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
                          >
                            {copiedKey === `hl_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Body & CTA */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Persuasive Ad Copy</h3>
                      <button
                        onClick={() => copyToClipboard(generatedData.description, 'body')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                      >
                        {copiedKey === 'body' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                      {generatedData.description}
                    </div>

                    <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase block">Call To Action</span>
                        <span className="text-xs font-bold text-white">{generatedData.callToAction}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(generatedData.callToAction, 'cta')}
                        className="p-1.5 bg-slate-900 text-slate-400 rounded-lg"
                      >
                        {copiedKey === 'cta' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Social Captions */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                      Platform Ready Captions
                    </h3>
                    <div className="space-y-4">
                      {generatedData.socialCaptions.map((soc, idx) => (
                        <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-indigo-400">{soc.platform}</span>
                            <button
                              onClick={() => copyToClipboard(`${soc.text}\n\n${soc.hashtags.join(' ')}`, `soc_${idx}`)}
                              className="text-xs text-indigo-400 flex items-center gap-1"
                            >
                              {copiedKey === `soc_${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>Copy</span>
                            </button>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{soc.text}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {soc.hashtags.map((h, i) => (
                              <span key={i} className="text-[10px] text-indigo-400 font-medium">{h}</span>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Input Form */}
            <div className="lg:col-span-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-800 mb-4">
                  <Film className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-white text-base">Video Script Parameters</h3>
                </div>

                <form onSubmit={handleGenerateVideoStoryboard} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Business Name</label>
                    <input
                      type="text"
                      value={videoPrompt.businessName}
                      onChange={(e) => setVideoPrompt({ ...videoPrompt, businessName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Product / Core Message</label>
                    <textarea
                      rows={3}
                      value={videoPrompt.productOrService}
                      onChange={(e) => setVideoPrompt({ ...videoPrompt, productOrService: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Target Format</label>
                    <select
                      value={videoPrompt.targetPlatform}
                      onChange={(e) => setVideoPrompt({ ...videoPrompt, targetPlatform: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="tiktok">TikTok 9:16 Vertical Video</option>
                      <option value="instagram_reels">Instagram Reels 9:16 Story</option>
                      <option value="youtube_shorts">YouTube Shorts 9:16 Feed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Duration</label>
                    <select
                      value={videoPrompt.durationSeconds}
                      onChange={(e) => setVideoPrompt({ ...videoPrompt, durationSeconds: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value={15}>15 Seconds (Ultra-Fast Hook)</option>
                      <option value={30}>30 Seconds (Standard Commercial)</option>
                      <option value={60}>60 Seconds (Deep Showcase)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isVideoGenerating}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white font-bold shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2"
                  >
                    {isVideoGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Drafting Storyboard...</span>
                      </>
                    ) : (
                      <>
                        <Clapperboard className="w-4 h-4" />
                        <span>Generate Video Storyboard</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Storyboard View */}
            <div className="lg:col-span-8">
              {!videoStoryboard ? (
                <div className="h-full min-h-[400px] border border-dashed border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-slate-900/30">
                  <Video className="w-12 h-12 text-slate-600 mb-3" />
                  <h4 className="font-bold text-white text-base">No Storyboard Generated Yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Generate scene-by-scene filming directions, Nigerian voiceover scripts, and viral hooks for TikTok & Instagram.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Storyboard Header Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div>
                        <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">Video Concept</span>
                        <h3 className="text-lg font-black text-white">{videoStoryboard.title}</h3>
                        <p className="text-xs text-slate-400 mt-1">{videoStoryboard.conceptOverview}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-bold text-emerald-400 block">{videoStoryboard.estimatedDurationSeconds}s Duration</span>
                        <span className="text-[10px] text-slate-500 uppercase">{videoStoryboard.targetPlatform}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs">
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">⚡ First 3-Second Viral Hook</span>
                        <span className="text-white font-bold italic">"{videoStoryboard.hook}"</span>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">🎵 Soundtrack Direction</span>
                        <span className="text-slate-300">{videoStoryboard.soundtrackSuggestion}</span>
                      </div>
                    </div>
                  </div>

                  {/* Scenes Timeline */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Scene Breakdown ({videoStoryboard.scenes.length} Scenes)
                    </h4>
                    {videoStoryboard.scenes.map((scene) => (
                      <div key={scene.sceneNumber} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-black text-xs flex items-center justify-center">
                              {scene.sceneNumber}
                            </span>
                            <span className="text-xs font-bold text-white">Scene {scene.sceneNumber} ({scene.durationSeconds}s)</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">Camera: {scene.cameraAngle}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Visual Action</span>
                            <p className="text-slate-300">{scene.visualDescription}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">🎙️ Voiceover Script</span>
                            <p className="text-white font-medium italic">"{scene.voiceoverScript}"</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-pink-400 uppercase block mb-1">💬 On-Screen Overlay Text</span>
                            <p className="text-pink-300 font-bold bg-pink-500/10 p-2 rounded-lg border border-pink-500/20">
                              {scene.onScreenText}
                            </p>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-white">Multi-Format Visual Display Concepts</h3>
              <p className="text-xs text-slate-400">Tailored banner templates across Feed, Stories, and Google Ads placements.</p>
            </div>

            <button
              onClick={handleGenerateImageConcepts}
              disabled={isImgGenLoading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isImgGenLoading ? 'animate-spin' : ''}`} />
              <span>Regenerate Layouts</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {imageConcepts.map((concept) => (
              <div key={concept.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                      {concept.aspectRatio} Ratio
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{concept.format}</span>
                  </div>

                  <h4 className="font-black text-white text-sm mb-1">{concept.title}</h4>
                  <p className="text-xs text-slate-400 mb-3">{concept.layoutDescription}</p>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2 mb-3">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Headline:</span>
                      <span className="font-bold text-white">{concept.overlayText.headline}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Offer Badge:</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                        {concept.overlayText.badge}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveView('campaigns');
                  }}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1"
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
