import { useEffect } from 'react';
import { wobble } from 'ldrs';

export default function ClientOnlyWobble(props) {
  useEffect(() => {
    wobble.register();
  }, []);

  return <l-wobble {...props}></l-wobble>;
}