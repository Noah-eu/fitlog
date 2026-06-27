import { auth } from '../firebase/config'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from 'firebase/auth'

export async function signIn(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password)
}

export async function signOutUser() {
    return signOut(auth)
}

export function onAuthChanged(cb: (user: User | null) => void) {
    return onAuthStateChanged(auth, cb)
}
