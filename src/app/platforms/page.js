import ListManager from '../components/ListManager';

export default function PlatformsPage() {
  return (
    <ListManager 
      title="Platforms" 
      description="Manage the different competitive programming and interview platforms you use." 
      apiEndpoint="/api/platforms" 
      itemName="Platform" 
    />
  );
}
