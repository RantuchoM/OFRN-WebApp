import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabase";

export default function ThemeController() {
  const { user } = useAuth();

  const hexToRgb = (hex) => {
    if (!hex) return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : null;
  };

  const applyColor = (color) => {
    document.documentElement.style.setProperty("--theme-primary", color);
  };

  useEffect(() => {
    const fetchUserColor = async () => {
      if (!user?.id) {
        applyColor("79, 70, 229");
        return;
      }
      try {
        const { data } = await supabase
          .from("integrantes")
          .select("avatar_color")
          .eq("id", user.id)
          .single();

        if (data?.avatar_color) {
          const rgb = hexToRgb(data.avatar_color);
          if (rgb) applyColor(rgb);
        }
      } catch (err) {
        applyColor("99, 102, 241"); // RGB para #6366f1
      }
    };

    fetchUserColor();

    // --- ESCUCHAR CAMBIO EN TIEMPO REAL (Supabase) ---
    const channel = supabase
      .channel("theme_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "integrantes",
          filter: `id=eq.${user?.id}`,
        },
        (payload) => {
          if (payload.new?.avatar_color) {
            const rgb = hexToRgb(payload.new.avatar_color);
            if (rgb) applyColor(rgb);
          }
        },
      )
      .subscribe();

    // --- ESCUCHAR EVENTO LOCAL (Instantáneo) ---
    const handleLocalThemeChange = (event) => {
      const newHex = event.detail;
      const rgb = hexToRgb(newHex);
      if (rgb) applyColor(rgb);
    };

    window.addEventListener("theme-changed", handleLocalThemeChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("theme-changed", handleLocalThemeChange);
    };
  }, [user?.id]);

  return null;
}
