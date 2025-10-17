export const getGlucoseStatus = (glucose: number, lowGlucose: number, highGlucose: number) => {
  if (glucose < lowGlucose) return { color: 'bg-red-100 text-red-800', status: 'Low' };
  if (glucose > highGlucose) return { color: 'bg-yellow-100 text-yellow-800', status: 'High' };
  return { color: 'bg-green-100 text-green-800', status: 'In Range' };
};

export const getDirectionIcon = (direction: string | null) => {
  switch (direction) {
    case 'NONE': return '⟷';
    case 'DoubleUp': return '⇈';
    case 'SingleUp': return '↑';
    case 'FortyFiveUp': return '↗';
    case 'Flat': return '→';
    case 'FortyFiveDown': return '↘';
    case 'SingleDown': return '↓';
    case 'DoubleDown': return '⇊';
    case 'NOT COMPUTABLE': return '-';
    case 'RATE OUT OF RANGE': return '⚠️';
    case 'Slight Rise': return '↗';
    case 'Slight Fall': return '↘';
    case 'Rise': return '↑';
    case 'Fall': return '↓';
    case 'Rapid Rise': return '⇈';
    case 'Rapid Fall': return '⇊';
    default: return '→';
  }
};

export const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'improving': return '📈';
    case 'declining': return '📉';
    default: return '➡️';
  }
};

export const formatTime = (dateInput: string | number) => {
  // Handle both string and number (timestamp) inputs
  const date = typeof dateInput === 'number' ? new Date(dateInput) : new Date(dateInput);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

export const formatRelativeTime = (dateInput: string | number) => {
  const now = new Date();
  // Handle both string and number (timestamp) inputs
  const date = typeof dateInput === 'number' ? new Date(dateInput) : new Date(dateInput);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}h ago`;
  } else {
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }
};

export const getVariabilityColor = (variability: number) => {
  if (variability < 20) return 'text-green-600';
  if (variability < 30) return 'text-yellow-600';
  return 'text-red-600';
};
