import type { LucideIcon } from "lucide-react";
import {
  Baby,
  Bone,
  Brain,
  Ear,
  Eye,
  HeartHandshake,
  HeartPulse,
  Sparkles,
  Stethoscope,
} from "lucide-react";

interface SpecialtyIconProps {
  iconName?: string;
  size?: number;
  className?: string;
}

export function SpecialtyIcon({
  iconName = "stethoscope",
  size = 18,
  className = "",
}: SpecialtyIconProps) {
  const normalized = iconName.toLowerCase().replace(/_/g, "-");

  let IconComponent: LucideIcon = Stethoscope;

  switch (normalized) {
    case "heart-pulse":
    case "cardiology":
      IconComponent = HeartPulse;
      break;
    case "sparkles":
    case "dermatology":
      IconComponent = Sparkles;
      break;
    case "baby":
    case "pediatrics":
      IconComponent = Baby;
      break;
    case "bone":
    case "orthopedics":
      IconComponent = Bone;
      break;
    case "brain":
    case "neurology":
      IconComponent = Brain;
      break;
    case "heart-handshake":
    case "gynecology":
      IconComponent = HeartHandshake;
      break;
    case "ear":
    case "ent":
      IconComponent = Ear;
      break;
    case "eye":
    case "ophthalmology":
      IconComponent = Eye;
      break;
    default:
      IconComponent = Stethoscope;
      break;
  }

  return <IconComponent size={size} className={className} />;
}
