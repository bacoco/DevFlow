import type { NextApiRequest, NextApiResponse } from 'next';

type HealthResponse = {
  service: string;
  status: string;
  timestamp: string;
  version: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  res.status(200).json({
    service: 'dashboard',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}