import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useSession } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';

export default function useConfigurationSync() {
  const { status } = useSession();
  const navigate = useNavigate();

  const settings = useAppStore((state) => state.settings);
  const fetchSettings = useAppStore((state) => state.fetchSettings);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const [form, setForm] = useState({
    dailyGoal: '2',
    weeklyGoal: '10',
    srsLevel1: '1',
    srsLevel2: '3',
    srsLevel3: '7',
    srsLevel4: '14',
    maxFlashcards: '20',
    weekStart: '0',
    defaultDifficulty: 'Medium',
    defaultPlatform: 'LeetCode',
    heatmapTheme: 'green',
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      navigate('/');
    }
  }, [status, navigate]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      setForm((prev) => ({
        ...prev,
        dailyGoal: settings.dailyGoal || '2',
        weeklyGoal: settings.weeklyGoal || '10',
        srsLevel1: settings.srsLevel1 || '1',
        srsLevel2: settings.srsLevel2 || '3',
        srsLevel3: settings.srsLevel3 || '7',
        srsLevel4: settings.srsLevel4 || '14',
        maxFlashcards: settings.maxFlashcards || '20',
        weekStart: settings.weekStart || '0',
        defaultDifficulty: settings.defaultDifficulty || 'Medium',
        defaultPlatform: settings.defaultPlatform || 'LeetCode',
        heatmapTheme: settings.heatmapTheme || 'green',
      }));
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings(form);
      toast.success('Settings saved successfully!');
    } catch (err) {
      // Error handled in store logger
    } finally {
      setIsSaving(false);
    }
  };

  return {
    status,
    form,
    isSaving,
    handleChange,
    handleSave,
  };
}
