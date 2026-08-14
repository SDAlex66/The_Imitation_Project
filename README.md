# The Imitation Project

**A full-stack Turing Test web application designed to evaluate human paranoia of AI deception and ranking model capabilities within a live text chat.**

This repository contains the source code for “The Imitation Project”, built for my Computer Science dissertation. It functions as a live evaluation platform that gathers data on human ability to discern if they're talking to another human or a Large Language Model in real-time text chats. 

<br>

### Check it out on PC or Mobile: [alextula.com](https://alextula.com)
***

<br>

* ### Screenshots:

<h2 align="center">
  Interactive Data Dashboard
</h2>
<br>
<p align="center">
  <img src="https://github.com/user-attachments/assets/54eb978a-6d65-4889-a534-188ebf332982" width="52.8%" alt="image" />
  <img src="https://github.com/user-attachments/assets/ff8f7689-1a21-41af-9628-38f79524940c" width="46.7%" alt="image" />
</p>
<br>
<h2 align="center">
  Live Chat and Evaluation
</h2>
<br>
<p align="center">
  <img src="https://github.com/user-attachments/assets/9ba925a7-5ada-49dd-bcc4-88c1faf859b3" width="49%" alt="image" />
  <img src="https://github.com/user-attachments/assets/d91376d4-9535-4aba-a18d-b9b884f415b6" width="50.5%" alt="image" />
</p>

***

## Tech Stack

*   **Frontend:** `React`+`JavaScript`+`CSS`
*   **Backend:** `Node.js`+`Express`+`Websockets`
*   **Deployment:** `Vercel`+`Render`

***

## Core Features

*   **Dynamic Matchmaking:** Connects users instantly to either a human peer or an AI agent.
*   **Gameplay Loop:** Manages seamless state transitions from matchmaking to live chat and post-match evaluation.
*   **Handling Interrupts Gracefully:** Reconnecting to the same chat session available for a short period after disconnecting.
*   **Real-Time Interface:** Implements auto-scrolling chat functionality and strict telemetry collection.
*   **Data Validation:** Secures high-quality telemetry for academic analysis by filtering out invalid interactions.
*   **Mobile Compatibility:** Dedicated styles for mobile devices ensuring compatibility on all platforms.

***

## System Architecture

The application’s logic is built around strict state management to control the user experience and ensure data integrity. 

*   *Matchmaking:* Handles concurrent user queues and assigns session types.
*   *Chat:* Controls session duration, renders incoming message payloads, and manages UI updates.
*   *Evaluation:* Prompts players for their verdict and confidence rating, validates the input, and persists the telemetry to the database.

***
