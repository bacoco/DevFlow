import React from 'react';
import ChartDemo from '../components/Charts/ChartDemo';
import styles from '../components/Charts/Charts.module.css';

const ChartsDemoPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <ChartDemo />
    </div>
  );
};

export default ChartsDemoPage;