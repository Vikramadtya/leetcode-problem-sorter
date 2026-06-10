import ListManager from '../components/ListManager';

export default function PatternsPage() {
  return (
    <ListManager 
      title="Patterns" 
      description="Recognize recurring problem-solving techniques to solve faster and smarter." 
      apiEndpoint="/api/patterns" 
      itemName="Pattern" 
    />
  );
}
