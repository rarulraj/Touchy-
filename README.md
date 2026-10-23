# Touchy

Imagine it. Touchy is already on the notch.

Touchy is the creative backbone for iOS. Same idea as [heyclicky](https://www.heyclicky.com) on a Mac: a buddy that lives with you, sees the screen, and you talk to it. On the phone, Touchy lives in the notch. Tap it, say what you see, and it makes a real project — a dashboard, a site, a quiz, a deck, a moodboard — from one schema. You then drag, resize, circle a region, and tell the notch what should change. There is no code editor.

## Run

```bash
npm install
npm run typecheck
npm run verify
npx expo start
```

Open the iOS simulator. Touchy starts a Live Activity, so it stays in the real notch after you leave the app. Tap listen and talk. Circle a piece and Touchy says the next tap.

## What works without accounts

The Touchy engine turns a prompt into a validated project on the phone. Filters, quiz scoring, page navigation, and circle-to-edit all run on that project. Nothing is stored off the device until you add the keys below.

## Keys

| Need | Variable | What it unlocks |
| --- | --- | --- |
| Cloud save | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Sync. Apply `supabase/schema.sql`, enable anonymous sign-in, and create a public `assets` bucket. |
| Model generation | `OPENAI_API_KEY` | The server route `src/app/api/ai+api.ts` asks OpenAI for a project or a list of edits. The phone never sees the key. Invalid model output is rejected and the on-device engine is used. |
| Share links | `EXPO_PUBLIC_SHARE_BASE_URL` | The public origin printed when you share. The shared page plays the saved snapshot. |

Payments, accounts inside a created website, and other outside services are not invented by the canvas. A creation can link out or keep a form on the device. Wiring those up takes a real backend.

## Demos

The library starts with five creations on the same renderer:

1. Personal finance dashboard. Week, month, and all change the totals and the chart.
2. Biology study guide with a scored quiz.
3. Multi-page portfolio.
4. Pitch deck.
5. Apartment moodboard. Switch to Touch and drag the pictures, or Circle and say what should change.
