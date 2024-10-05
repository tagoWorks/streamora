# Streamora

Streamora is a modern web application for streaming and watching content online. It provides a seamless experience for both content creators and viewers. Play all your favorite music from YouTube. Want to listen to live podcasts? We have that too. On your phone, tablet, or computer, everyone is included.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Technologies Used](#technologies-used)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Contribute](#Contribute)
- [License and Contact](#license-and-contact)

## Features

- Modern React and Next.js 13 setup with App Router
- Tailwind CSS for styling
- ESLint for code linting
- Authentication system using Google Firebase
- Custom UI components

## Getting Started

To get started with Streamora, follow these steps:

1. Clone the repository:
   ```
   git clone https://github.com/tagoWorks/streamora.git
   ```

2. Install dependencies:
   ```
   cd streamora
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Technologies Used

![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-a08021?style=for-the-badge&logo=firebase&logoColor=ffcd34)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)



## Scripts

- `npm run dev`: Runs the development server
- `npm run build`: Builds the application for production
- `npm start`: Starts the production server
- `npm run lint`: Runs ESLint to check for code issues

## Project Structure

The project follows a Next.js 13 structure with the app router:

```
streamora/
├── tailwind.config.js
├── next-env.d.ts
├── next.config.mjs
├── jsconfig.json
├── components.json
├── package.json
├── postcss.config.js
├── public/
│   └── genre-images/
│       ├── genre images...
│   ├── avatar.png
│   └── discover.svg
├── src/
│   ├── app/
│   │   ├── login/
│   │   │   └── page.js
│   │   ├── register/
│   │   │   └── page.js
│   │   ├── you/
│   │   │   └── page.js
│   │   ├── api/
│   │   │   └── youtube-search/
│   │   │   │   └── route.js
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.js
│   │   └── page.js
│   ├── fonts/
│   │   └── fonts...
│   ├── components/
│   │   ├── ui/
│   │   │   └── various UI components...
│   │   └── providers and wrappers...
│   ├── firebase/
│   │   └── auth.js
│   │   └── firebase.js
│   ├── hooks/
│   │   └── useLocalStorage.js
│   ├── lib/
│   │   └── utils.js
│   ├── utils/
│   │   └── cache.js
├── .eslintrc.json
├── .gitignore
├── next
├── README.md
└── LICENSE
```

## Contribute

Contributions to Streamora are welcome and appreciated! If you'd like to contribute, here's how you can get started:

1. Fork the repository on GitHub.
2. Clone your forked repository to your local machine.
3. Create a new branch for your feature or bug fix.
4. Make your changes and commit them with clear, descriptive commit messages.
5. Push your changes to your fork on GitHub.
6. Open a pull request from your fork to the main Streamora repository.

When submitting a pull request:
- Clearly describe the problem you're solving or the feature you're adding.
- Include any relevant issue numbers.
- Make sure your code follows the existing style of the project.
- Write or update tests as necessary.
- Ensure all tests pass before submitting.

If you're unsure about anything, don't hesitate to open an issue to discuss your ideas or ask questions. We appreciate all forms of contributions, from code to documentation improvements!

# License and Contact
This project is published under the [Apache-2.0 License](./LICENSE)

If you are interested in working together, or want to get in contact with me please email me at santiago@tago.works
