import { getAccessToken } from "@/lib/api";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function Index() {
    const router = useRouter();
    console.log("hehehheh")
    useEffect(() => {
        getAccessToken().then((token) => {
            if (token) router.replace("/(app)/home");
            else router.replace("/(auth)/login");
        });
    }, []);

    return null;
}