-- Create award_xp functions to fix missing RPC and trigger dependencies

-- Function for trigger usage (2 arguments)
CREATE OR REPLACE FUNCTION public.award_xp(p_user_id UUID, p_xp_amount INT)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_xp (user_id, xp_total, xp_current_level)
  VALUES (p_user_id, p_xp_amount, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET xp_total = user_xp.xp_total + p_xp_amount,
      xp_current_level = ((user_xp.xp_total + p_xp_amount) / 1000) + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for RPC usage (3 arguments, matching frontend call)
CREATE OR REPLACE FUNCTION public.award_xp(p_user_id UUID, p_event_type TEXT, p_xp_amount INT)
RETURNS void AS $$
BEGIN
  PERFORM public.award_xp(p_user_id, p_xp_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
