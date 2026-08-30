import { GoogleGenAI, Type } from '@google/genai';
import { 
  AIMarketingRequest, 
  AIMarketingResponse, 
  AIVideoConceptResponse,
  AIImageAdFormat
} from '../../types';

export interface AIProvider {
  generateMarketingCopy(request: AIMarketingRequest): Promise<AIMarketingResponse>;
  generatePromotionalImagePrompt(request: AIMarketingRequest): Promise<string>;
  generateVideoStoryboard(request: AIMarketingRequest): Promise<AIVideoConceptResponse>;
  generateImageAdConcepts(request: AIMarketingRequest): Promise<AIImageAdFormat[]>;
}

export class GeminiAIProvider implements AIProvider {
  private getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }

  public async generateMarketingCopy(request: AIMarketingRequest): Promise<AIMarketingResponse> {
    const client = this.getClient();

    if (!client) {
      return this.generateRuleBasedMarketingCopy(request);
    }

    try {
      const prompt = `You are the Lead Marketing & Advertising Director for Boost Market (by Real Boosters, CEO Maddy / Muhammad Kabir Ahmad), a premier African and global SaaS business advertising and local commerce platform.
Generate a comprehensive, high-converting promotional campaign package for the following business:
- Business Name: ${request.businessName || 'Local Business'}
- Product / Service: ${request.productOrService}
- Category: ${request.businessCategory}
- Target Audience: ${request.targetAudience}
- Location: ${request.location}
- Brand Tone: ${request.tone}
${request.customInstructions ? `- Custom Guidance: ${request.customInstructions}` : ''}

Provide your response strictly adhering to the JSON schema.`;

      const response = await client.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headlines: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 to 5 catchy, persuasive advertising headlines'
              },
              description: {
                type: Type.STRING,
                description: 'Compelling 2 to 3 paragraph advertising body copy'
              },
              socialCaptions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    platform: { type: Type.STRING, description: 'Instagram, WhatsApp, Facebook, Twitter/X, or TikTok' },
                    text: { type: Type.STRING, description: 'Optimized post text' },
                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ['platform', 'text', 'hashtags']
                },
                description: 'Tailored promotional captions for major social networks'
              },
              callToAction: {
                type: Type.STRING,
                description: 'Direct call to action'
              },
              suggestedHashtags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'High-traffic, locally relevant hashtags'
              },
              imagePrompt: {
                type: Type.STRING,
                description: 'Photorealistic prompt suitable for an AI image generator'
              },
              estimatedReachMultiplier: {
                type: Type.STRING,
                description: 'Estimated audience engagement boost'
              }
            },
            required: ['headlines', 'description', 'socialCaptions', 'callToAction', 'suggestedHashtags', 'imagePrompt', 'estimatedReachMultiplier']
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text.trim()) as AIMarketingResponse;
      }
      return this.generateRuleBasedMarketingCopy(request);
    } catch (err) {
      console.warn('[AI Service] Gemini API call failed, using rule engine:', err);
      return this.generateRuleBasedMarketingCopy(request);
    }
  }

  public async generateVideoStoryboard(request: AIMarketingRequest): Promise<AIVideoConceptResponse> {
    const client = this.getClient();

    if (!client) {
      return this.generateRuleBasedVideoConcept(request);
    }

    try {
      const prompt = `Create a viral 30-45 second video ad storyboard script for:
Business: ${request.businessName || 'Business'}
Product/Service: ${request.productOrService}
Location: ${request.location}
Target Audience: ${request.targetAudience}
Tone: ${request.tone}
${request.customInstructions ? `Special guidance: ${request.customInstructions}` : ''}

Format as a structured multi-scene video concept optimized for TikTok, Instagram Reels, and YouTube Shorts.`;

      const response = await client.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              conceptTitle: { type: Type.STRING },
              hook: { type: Type.STRING },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sceneNumber: { type: Type.INTEGER },
                    durationSeconds: { type: Type.NUMBER },
                    visualDescription: { type: Type.STRING },
                    voiceoverScript: { type: Type.STRING },
                    onScreenText: { type: Type.STRING },
                    cameraMovement: { type: Type.STRING }
                  },
                  required: ['sceneNumber', 'durationSeconds', 'visualDescription', 'voiceoverScript', 'onScreenText', 'cameraMovement']
                }
              },
              totalDurationSeconds: { type: Type.NUMBER },
              callToAction: { type: Type.STRING },
              recommendedMusicMood: { type: Type.STRING },
              suggestedHashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['conceptTitle', 'hook', 'scenes', 'totalDurationSeconds', 'callToAction', 'recommendedMusicMood', 'suggestedHashtags']
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text.trim()) as AIVideoConceptResponse;
      }
      return this.generateRuleBasedVideoConcept(request);
    } catch (err) {
      console.warn('[AI Service] Video storyboard Gemini fallback:', err);
      return this.generateRuleBasedVideoConcept(request);
    }
  }

  public async generateImageAdConcepts(request: AIMarketingRequest): Promise<AIImageAdFormat[]> {
    const name = request.businessName || 'Verified Merchant';
    const item = request.productOrService;
    const loc = request.location || 'Nigeria';

    return [
      {
        format: 'square_1x1',
        label: 'Instagram & Facebook Feed (1:1 Square)',
        dimensions: '1080 x 1080 px',
        headline: `Premium ${item} in ${loc}`,
        badgeText: 'VERIFIED ON BOOST MARKET',
        overlayStyle: 'High-contrast bottom glass gradient with gold badge',
        recommendedCta: 'Order Now / Send Message'
      },
      {
        format: 'story_9x16',
        label: 'TikTok, Reels & WhatsApp Status (9:16 Vertical)',
        dimensions: '1080 x 1920 px',
        headline: `Looking for top-quality ${item}?`,
        badgeText: '⚡ DIRECT FROM KADUNA',
        overlayStyle: 'Dynamic top-bar banner with swipe-up CTA card',
        recommendedCta: 'Tap To Chat on WhatsApp'
      },
      {
        format: 'landscape_16x9',
        label: 'YouTube & Display Ads (16:9 Landscape)',
        dimensions: '1920 x 1080 px',
        headline: `${name} — Trusted ${item} Specialists`,
        badgeText: '5-STAR RATED MERCHANT',
        overlayStyle: 'Split layout with focal product on right and value props on left',
        recommendedCta: 'Visit Storefront'
      },
      {
        format: 'banner_4x3',
        label: 'Marketplace Category Spotlight (4:3 Standard)',
        dimensions: '1200 x 900 px',
        headline: `Best Deal on ${item}`,
        badgeText: 'INSTANT FLUTTERWAVE CHECKOUT',
        overlayStyle: 'Corner trust shield with price spotlight tag',
        recommendedCta: 'View Pricing & Portfolio'
      }
    ];
  }

  public async generatePromotionalImagePrompt(request: AIMarketingRequest): Promise<string> {
    return `Ultra-high-definition commercial product and service advertisement photo of ${request.productOrService} for ${request.businessName || 'a premium brand'} in ${request.location}. Luxury lighting, vibrant depth of field, authentic setting, 8k resolution, award-winning advertising photography style.`;
  }

  private generateRuleBasedVideoConcept(request: AIMarketingRequest): AIVideoConceptResponse {
    const name = request.businessName || 'Real Boosters Merchant';
    const item = request.productOrService || 'Premium Offering';
    const loc = request.location || 'Kaduna, Nigeria';

    return {
      conceptTitle: `Why Smart Buyers in ${loc} Choose ${name} for ${item}`,
      hook: `Stop making this common mistake when buying ${item}! Here is what top insiders in ${loc} do instead.`,
      totalDurationSeconds: 32,
      callToAction: `Tap the link to chat with ${name} on Boost Market for exclusive offers!`,
      recommendedMusicMood: 'Energetic Afrobeat or Upbeat Modern Corporate Lo-Fi',
      suggestedHashtags: ['#BoostMarket', '#RealBoosters', `#${item.replace(/\s+/g, '')}`, '#NigerianBusiness', '#VerifiedMerchant'],
      scenes: [
        {
          sceneNumber: 1,
          durationSeconds: 4,
          visualDescription: `Fast dramatic zoom on high-quality ${item} in use with bold text overlay.`,
          voiceoverScript: `Are you tired of low-grade ${item} that fails when you need it most?`,
          onScreenText: `❌ Avoid Bad Quality ${item}!`,
          cameraMovement: 'Fast push-in zoom with dynamic motion blur'
        },
        {
          sceneNumber: 2,
          durationSeconds: 8,
          visualDescription: `Cinematic close-up of craftsmanship, pristine materials, and customer satisfaction at ${name}.`,
          voiceoverScript: `Meet ${name} in ${loc}. We deliver certified, verified ${item} built for absolute reliability and luxury.`,
          onScreenText: `✅ 100% Quality Guaranteed | ${loc}`,
          cameraMovement: 'Smooth orbital pan showcasing fine textures'
        },
        {
          sceneNumber: 3,
          durationSeconds: 10,
          visualDescription: `Customer receiving express delivery, testing the product, and paying seamlessly on mobile.`,
          voiceoverScript: `Hundreds of satisfied clients trust us. Order smoothly and pay with instant Flutterwave security right on Boost Market.`,
          onScreenText: `⚡ Fast Nationwide Delivery & Secure Checkout`,
          cameraMovement: 'Medium tracking shot following seamless unboxing'
        },
        {
          sceneNumber: 4,
          durationSeconds: 10,
          visualDescription: `Branded end card with Boost Market verified badge, WhatsApp icon, and glowing Call to Action.`,
          voiceoverScript: `Don't wait! Tap the message button now to claim your special discount on Boost Market!`,
          onScreenText: `👉 Tap To Message ${name} Now!`,
          cameraMovement: 'Static centered focus with subtle pulse glow'
        }
      ]
    };
  }

  private generateRuleBasedMarketingCopy(request: AIMarketingRequest): AIMarketingResponse {
    const name = request.businessName || 'Boost Market Partner';
    const item = request.productOrService || 'Premium Offering';
    const loc = request.location || 'Kaduna, Nigeria';
    const audience = request.targetAudience || 'Discerning Customers';

    const headlines = [
      `Elevate Your Lifestyle with ${item} from ${name}`,
      `Top-Rated ${item} in ${loc} — Fast Delivery & Best Quality Guaranteed`,
      `Exclusive Offer: Premium ${item} Tailored for ${audience}`,
      `Why Customers in ${loc} Trust ${name} for ${item}`
    ];

    const description = `Looking for exceptional ${item} in ${loc}? ${name} brings you unmatched craftsmanship, dependable service, and unbeatable value tailored specifically for ${audience}. Whether you are ordering for immediate delivery or planning a custom request, our verified team ensures seamless transactions and 100% satisfaction.\n\nVisit our verified profile on Boost Market to browse our full catalog, view past customer reviews, chat with us directly, and pay securely via instant Flutterwave & Paystack checkout.`;

    const socialCaptions = [
      {
        platform: 'Instagram' as const,
        text: `✨ Upgrade your standards with premium ${item} by @${name.toLowerCase().replace(/[^a-z0-9]/g, '')}! Now available in ${loc} with fast delivery. Tap the link in bio to explore our catalog and chat directly on Boost Market! 🚀`,
        hashtags: [`#${item.replace(/\s+/g, '')}`, `#${loc.split(',')[0].replace(/\s+/g, '')}Business`, '#BoostMarket', '#RealBoosters', '#MadeInNigeria']
      },
      {
        platform: 'WhatsApp' as const,
        text: `Salam / Hello! 👋 Exclusive special on *${item}* from *${name}* (${loc}). Check our live portfolio & invoice checkout on Boost Market today. Message us here for fast response!`,
        hashtags: ['#DirectOrder', '#VerifiedVendor']
      },
      {
        platform: 'Twitter/X' as const,
        text: `If you are in ${loc} and need top-tier ${item}, check out ${name} on Boost Market! Verified quality, transparent pricing, and instant secure payment. 💼📈`,
        hashtags: ['#BoostMarket', '#NigeriaBusiness']
      }
    ];

    return {
      headlines,
      description,
      socialCaptions,
      callToAction: `Claim Special Offer from ${name}`,
      suggestedHashtags: ['#BoostMarket', '#RealBoosters', '#MadeInNigeria', '#AfricanEntrepreneurs', '#KadunaCommerce'],
      imagePrompt: `Commercial advertisement product photography of ${item} for ${name} in ${loc}, studio lighting, ultra sharp, 8k.`,
      estimatedReachMultiplier: '4.2x Engagement'
    };
  }
}

export const aiService = new GeminiAIProvider();

