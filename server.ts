import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase payload limit for base64 invoices/receipts (PDFs, images)
app.use(express.json({ limit: '50mb' }));

// Lazy initialization of Gemini API
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// PWA Manifest endpoints
app.get(['/manifest.json', '/manifest.webmanifest'], (req, res) => {
  const manifestPath = path.join(process.cwd(), 'public', 'manifest.webmanifest');
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(manifestPath);
});

// PWA Service Worker endpoint
app.get('/sw.js', (req, res) => {
  const swPath = path.join(process.cwd(), 'public', 'sw.js');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(swPath);
});

// Endpoint to analyze an uploaded invoice with Gemini AI
app.post('/api/analyze-invoice', async (req, res) => {
  try {
    const { fileBase64, mimeType, fileName, textContent } = req.body;

    if (!fileBase64 && !textContent) {
      return res.status(400).json({ error: 'Fichier ou contenu requis pour l\'analyse.' });
    }

    const ai = getAIClient();

    const systemPrompt = `Tu es un expert-comptable français de haut niveau. 
Analyse minutieusement cette facture ou ce justificatif comptable (dépense fournisseur ou facture client de vente).
Extrais avec exactitude les informations financières et comptables en JSON strict selon le schéma spécifié.

Règles de détection :
- Type de document : "EXPENSE" pour une facture fournisseur / achat / note de frais / reçu, ou "INCOME" pour une facture client / vente émise.
- Montants : Extraire impérativement les montants numériques (nombres à virgule flottante, ex: 1250.50). 
  - amountHT (Montant Hors Taxes)
  - amountTVA (Montant de la TVA)
  - tvaRate (Taux principal de TVA en %, ex: 20, 10, 5.5 ou 0)
  - amountTTC (Montant Toutes Taxes Comprises). Si amountHT + amountTVA = amountTTC, assure la cohérence mathématique.
- Tiers : Le nom de l'émetteur (fournisseur) ou du destinataire (client).
- Numéro de facture (invoiceNumber).
- Date d'émission (issueDate) au format YYYY-MM-DD. Si inconnue, renvoie la date du jour.
- Date d'échéance (dueDate) au format YYYY-MM-DD.
- Catégorie comptable : choisir parmi:
  "SAAS_HOSTING", "SERVICES_SUBCONTRACTING", "EQUIPMENT_HARDWARE", "LEGAL_ACCOUNTING", "RENT_OFFICE", "MARKETING_COM", "TRAVEL_MEALS", "SALARIES_CHARGES", "BANK_TAXES", "CLIENT_INVOICE", "PRODUCT_SALES", "OTHER_EXPENSE", "OTHER_INCOME"
- Mode de paiement suggéré : "VIREMENT", "CB", "PRELEVEMENT", "CHEQUE", ou "ESPECES"
- Statut de paiement : "PAID" si mention "Acquittée", "Payée", "Carte bancaire", sinon "PENDING".
- Description claire et professionnelle de la transaction.
- Inter-company : indique true si la facture semble être entre des sociétés du même groupe (ex: Dryos).`;

    const parts: any[] = [{ text: systemPrompt }];

    if (fileBase64 && mimeType) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: fileBase64,
        },
      });
      parts.push({ text: `Nom du fichier original : ${fileName || 'facture'}` });
    } else if (textContent) {
      parts.push({ text: `Contenu texte de la facture : \n${textContent}` });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: parts,
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const outputText = response.text || '{}';
    let parsedData = {};
    try {
      parsedData = JSON.parse(outputText);
    } catch {
      // Fallback in case response is wrapped
      const match = outputText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      }
    }

    return res.json({
      success: true,
      analysis: parsedData,
    });
  } catch (error: any) {
    console.error('Erreur analyse facture avec Gemini:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'analyse de la facture avec Gemini',
    });
  }
});

async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  // In production (or whenever dist/index.html is built and we're running the bundled server), serve static files
  const isDev = process.env.NODE_ENV === 'development' || (!hasDist && process.env.NODE_ENV !== 'production');

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
