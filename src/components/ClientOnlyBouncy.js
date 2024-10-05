import { useEffect } from 'react';
import { bouncy } from 'ldrs';

export default function ClientOnlyBouncy(props) {
  useEffect(() => {
    bouncy.register();
  }, []);

  return <l-bouncy {...props}></l-bouncy>;
}