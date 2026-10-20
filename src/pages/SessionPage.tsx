import { useAppStore } from '../store/AppStore';
import { GuidedSession } from './session/GuidedSession';
import { SessionBuilder } from './session/SessionBuilder';

export default function SessionPage() {
  const { data } = useAppStore();
  return data.active ? <GuidedSession active={data.active} /> : <SessionBuilder />;
}
