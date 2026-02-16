
import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Calendar, Users } from 'lucide-react';
import Button from './Button';

interface FeaturedIssueProps {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  image: string;
  date: string;
  volunteerCount: number;
}

// Priority/Urgency system based on upvote count
const getPriorityLevel = (upvoteCount: number) => {
  if (upvoteCount >= 10) {
    return {
      level: 'CRITICAL',
      color: 'bg-red-100 text-red-700 border-red-300',
      dotColor: 'bg-red-500',
      label: 'Dangerous'
    };
  } else if (upvoteCount >= 5) {
    return {
      level: 'MODERATE',
      color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      dotColor: 'bg-yellow-500',
      label: 'Moderate'
    };
  } else {
    return {
      level: 'MINOR',
      color: 'bg-green-100 text-green-700 border-green-300',
      dotColor: 'bg-green-500',
      label: 'Minor'
    };
  }
};

const FeaturedIssue: React.FC<FeaturedIssueProps> = ({
  id,
  title,
  description,
  location,
  category,
  image,
  date,
  volunteerCount
}) => {
  const priority = getPriorityLevel(volunteerCount);
  
  return (
    <div className="relative rounded-2xl overflow-hidden glass-dark h-[500px] group">
      <div className="absolute inset-0 overflow-hidden">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-2000 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
      </div>
      
      <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
        <div className="flex items-center gap-2 mb-4">
          <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium">
            {category}
          </div>
          {/* Priority Badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${priority.color}`}>
            <span className={`w-2 h-2 rounded-full ${priority.dotColor}`}></span>
            {priority.label}
          </div>
        </div>
        
        <h2 className="text-white text-3xl md:text-4xl font-semibold mb-4 max-w-2xl text-balance">
          {title}
        </h2>
        
        <p className="text-white/80 mb-6 max-w-2xl text-balance line-clamp-3 md:line-clamp-none">
          {description}
        </p>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 justify-between">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center text-white/90">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{location}</span>
            </div>
            <div className="flex items-center text-white/90">
              <Calendar className="h-4 w-4 mr-2" />
              <span>{date}</span>
            </div>
            <div className="flex items-center text-white/90">
              <Users className="h-4 w-4 mr-2" />
              <span>{volunteerCount} volunteers</span>
            </div>
          </div>
          
          <Link to={`/issues/${id}`}>
            <Button className="group">
              <span>View Issue</span>
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FeaturedIssue;
