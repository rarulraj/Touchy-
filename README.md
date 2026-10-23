# Touchie

Anything you imagine, at your fingertips.

Touchie is a mobile creation canvas. You describe a dashboard, a site, a quiz, a deck, or a moodboard. It builds a real, touchable project from one schema. You then drag, resize, circle a region, and ask for a change. There is no code editor.

## Run

```bash
npm install
npm run typecheck
npm run verify
npx expo start
```

Open the iOS simulator, Android, or press `w` for the web preview. The first screen asks “What do you want to make?”

## What works without accounts

The Touchie engine turns a prompt into a validated project on the phone. Filters, quiz scoring, page navigation, and circle-to-edit all run on that project. Nothing is stored off the device until you add the keys below.

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
