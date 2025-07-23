import { supabase } from "@/lib/supabase";

export default function AuthForm() {
    type Provider = 'google' | 'discord' | 'twitch'; // extend this as needed

    async function handleOAuth(provider: Provider) {
        const { error } = await supabase.auth.signInWithOAuth({ provider });
        if (error) console.error(error.message);
    }

    return (
        <div className="space-y-4">
            {/* ... email/password fields */}

            <button
                onClick={() => handleOAuth('google')}
                className="bg-white text-black border px-4 py-2 w-full rounded"
            >
                Sign in with Google
            </button>

            <button
                onClick={() => handleOAuth('twitch')}
                className="bg-purple-600 text-white px-4 py-2 w-full rounded"
            >
                Sign in with Twitch
            </button>

            <button
                onClick={() => handleOAuth('discord')}
                className="bg-indigo-600 text-white px-4 py-2 w-full rounded"
            >
                Sign in with Discord
            </button>

        </div>
    );
}
