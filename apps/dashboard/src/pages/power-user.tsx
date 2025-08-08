import React from 'react';
import Head from 'next/head';
import { PowerUserDemo } from '../components/PowerUser/PowerUserDemo';

export default function PowerUserPage() {
  return (
    <>
      <Head>
        <title>Power User Features - DevFlow Intelligence</title>
        <meta name="description" content="Advanced interaction patterns for power users" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PowerUserDemo />
      </div>
    </>
  );
}