import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { recordLike } from '../lib/chatHelpers'
import '../pages/Home.css'
import './ViewProfile.css'

const POLITICAL_DISPLAY = {
  'Progressive': 'Left',
  'Liberal': 'Left',
  'Center left': 'Left',
  'Centrist': 'Center',
  'Center right': 'Right',
  'Conservative': 'Right',
}
const displayPolitical = (val) => POLITICAL_DISPLAY[val] || val

function calcAge(dob) {
  if (!dob) return null
  try {
    const birth = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age > 0 ? String(age) : null
  } catch (_) {
    return null
  }
}

const filterPreferNotToSay = (arr) =>
  (arr || []).filter(v => v !== 'Prefer not to say' && v !== 'Prefer not to share')

const RainbowIcon = () => (
  <svg viewBox="0 0 1200 1200" fill="currentColor">
    <path d="m1076.3 829.69c-1.4062-261.47-214.55-473.81-476.29-473.81-262.6 0-476.26 213.66-476.29 476.26 0 3.1875 1.2656 6.2344 3.5156 8.4844s5.2969 3.5156 8.4844 3.5156h254.67c6.6094 0 12-5.3438 12-12 0.09375-108.89 88.734-197.53 197.63-197.53 108.89 0 197.53 88.594 197.58 197.53 0 6.6094 5.3906 12 12 12h254.91c6.6562 0 12-5.3438 12-12 0.046874-0.84375-0.046876-1.6875-0.1875-2.4375zm-850.26-22.453c0.23438-3.2344 0.42188-6.4688 0.75-9.7031 0.28125-3.0469 0.60938-6.0469 0.9375-9.0469 0.375-3.2344 0.75-6.4219 1.2188-9.6094 0.42188-2.9531 0.89062-5.8594 1.3594-8.8125 0.5625-3.1875 1.0781-6.375 1.7344-9.5625 0.5625-2.8594 1.1719-5.7656 1.7812-8.625 0.70312-3.1875 1.4062-6.3281 2.2031-9.4688 0.70312-2.8125 1.4062-5.5781 2.1562-8.3438 0.84375-3.1406 1.7344-6.2344 2.6719-9.3281 0.79688-2.7656 1.6875-5.4375 2.5312-8.1562 0.98438-3.0938 2.0625-6.1875 3.1406-9.2344 0.9375-2.6719 1.9219-5.2969 2.9062-7.9219 1.1719-3.0469 2.3438-6.0938 3.6094-9.0938 1.0781-2.5781 2.1562-5.1562 3.2344-7.6875 1.3125-3 2.6719-5.9531 4.0312-8.9062 1.1719-2.4844 2.3438-4.9688 3.5625-7.4062 1.4531-2.9062 2.9531-5.8125 4.4531-8.7188 1.2656-2.3906 2.5781-4.8281 3.8906-7.2188 1.5938-2.8594 3.2344-5.6719 4.875-8.4844 1.4062-2.3438 2.7656-4.6875 4.2188-6.9844 1.7344-2.7656 3.5156-5.5312 5.2969-8.25 1.5-2.25 2.9531-4.5 4.5-6.75 1.875-2.7188 3.75-5.3438 5.6719-8.0156 1.5938-2.1562 3.1406-4.3125 4.7812-6.4688 1.9688-2.625 4.0312-5.2031 6.0938-7.7344 1.6875-2.0625 3.3281-4.1719 5.0625-6.1875 2.1094-2.5312 4.2656-4.9688 6.4688-7.4531 1.7344-1.9688 3.5156-3.9844 5.2969-5.9531 2.25-2.4375 4.5469-4.7812 6.8438-7.1719 1.8281-1.875 3.7031-3.7969 5.5781-5.6719 2.3438-2.2969 4.7344-4.5938 7.1719-6.8438 1.9219-1.8281 3.8438-3.6562 5.8125-5.3906 2.4375-2.2031 4.9688-4.3594 7.5-6.5156 2.0156-1.6875 4.0312-3.4219 6.0469-5.1094 2.5781-2.1094 5.2031-4.125 7.8281-6.1406 2.1094-1.5938 4.1719-3.2344 6.2812-4.8281 2.6719-1.9688 5.3906-3.8906 8.1094-5.7656 2.1562-1.5 4.3125-3.0469 6.5156-4.5 2.7656-1.8281 5.5781-3.6094 8.3906-5.3906 2.25-1.4062 4.4531-2.8594 6.75-4.2188 2.8594-1.7344 5.7656-3.3281 8.6719-4.9688 2.2969-1.3125 4.5938-2.6719 6.9375-3.8906 2.9531-1.5938 5.9062-3.0469 8.9062-4.5469 2.3906-1.2188 4.7344-2.4375 7.1719-3.6094 3.0469-1.4531 6.0938-2.7656 9.1875-4.1719 2.4375-1.0781 4.8281-2.2031 7.3125-3.2344 3.0938-1.3125 6.2812-2.4844 9.4219-3.75 2.4844-0.9375 4.9688-1.9688 7.4531-2.9062 3.1875-1.1719 6.4219-2.2031 9.6562-3.2812 2.5312-0.84375 5.0625-1.7344 7.6406-2.5312 3.2812-1.0312 6.6562-1.9219 9.9844-2.8125 2.5312-0.70312 5.0625-1.5 7.6406-2.1562 3.4219-0.84375 6.8438-1.5938 10.312-2.3906 2.5781-0.5625 5.1094-1.2188 7.6875-1.7344 3.5156-0.70312 7.125-1.2656 10.641-1.9219 2.5312-0.42188 5.0625-0.9375 7.6406-1.3125 3.7031-0.5625 7.4531-0.98438 11.25-1.4062 2.4375-0.28125 4.875-0.65625 7.3594-0.9375 4.0781-0.42188 8.25-0.65625 12.375-0.9375 2.1562-0.14062 4.3125-0.375 6.4688-0.46875 6.3281-0.32812 12.703-0.46875 19.078-0.46875s12.75 0.1875 19.078 0.46875c2.2031 0.09375 4.3594 0.32812 6.5625 0.46875 4.125 0.28125 8.2031 0.51562 12.281 0.9375 2.5312 0.23438 5.0625 0.65625 7.5938 0.9375 3.6562 0.42188 7.3594 0.84375 10.969 1.4062 2.6719 0.375 5.25 0.9375 7.875 1.3594 3.4688 0.60938 6.9375 1.1719 10.359 1.875 2.6719 0.5625 5.2969 1.2188 7.9219 1.7812 3.3281 0.75 6.7031 1.4531 10.031 2.2969 2.7188 0.70312 5.3438 1.5 8.0156 2.25 3.2344 0.89062 6.4219 1.7344 9.6094 2.7188 2.7188 0.84375 5.3438 1.7812 8.0156 2.6719 3.0938 1.0312 6.1875 2.0156 9.2344 3.1406 2.6719 0.98438 5.2969 2.0625 7.9219 3.0938 2.9531 1.1719 6 2.2969 8.9531 3.5156 2.625 1.125 5.2031 2.2969 7.7812 3.4688 2.9062 1.3125 5.8125 2.5781 8.6719 3.9375 2.5781 1.2188 5.0625 2.5312 7.5938 3.7969 2.8125 1.4062 5.6719 2.8125 8.4375 4.3125 2.5312 1.3594 4.9688 2.7656 7.4531 4.1719 2.7188 1.5469 5.4375 3.0938 8.1562 4.6875 2.4375 1.4531 4.8281 3.0469 7.2656 4.5469 2.625 1.6406 5.25 3.2812 7.8281 5.0156 2.3906 1.5938 4.6875 3.2344 7.0312 4.875 2.5312 1.7812 5.1094 3.5625 7.5938 5.3906 2.2969 1.6875 4.5469 3.4688 6.7969 5.2031 2.4375 1.875 4.9219 3.7969 7.3125 5.7656 2.2031 1.7812 4.3594 3.6562 6.5156 5.4844 2.3438 2.0156 4.7344 4.0312 7.0781 6.0938 2.1094 1.875 4.1719 3.8438 6.2344 5.7656 2.25 2.1094 4.5469 4.2656 6.75 6.4219 2.0156 1.9688 3.9844 4.0312 5.9531 6.0938 2.1562 2.25 4.3125 4.4531 6.4219 6.75 1.9219 2.0625 3.7969 4.2188 5.6719 6.3281 2.0625 2.3438 4.125 4.6875 6.1406 7.0312 1.8281 2.1562 3.6094 4.4062 5.3906 6.6094 1.9219 2.4375 3.8438 4.8281 5.7656 7.3125 1.7344 2.25 3.4219 4.5938 5.1094 6.8906 1.8281 2.5312 3.6562 5.0156 5.3906 7.5938 1.6406 2.3438 3.1875 4.7344 4.7812 7.125 1.6875 2.5781 3.375 5.2031 5.0625 7.8281 1.5 2.4375 2.9531 4.875 4.4531 7.3594 1.5938 2.6719 3.1406 5.3438 4.6875 8.1094 1.4062 2.4844 2.7656 5.0156 4.0781 7.5938 1.4531 2.7656 2.8594 5.5312 4.2656 8.2969 1.2656 2.5781 2.5312 5.2031 3.75 7.8281 1.3125 2.8125 2.625 5.6719 3.8438 8.5312 1.1719 2.6719 2.2969 5.3438 3.4219 8.0625 1.1719 2.8594 2.2969 5.7656 3.4219 8.6719 1.0312 2.7656 2.0625 5.5312 3.0469 8.2969 1.0312 2.9062 2.0156 5.8594 3 8.8594 0.89062 2.8125 1.7812 5.625 2.6719 8.4844 0.89062 3 1.7344 6 2.5781 9.0469 0.79688 2.8594 1.5469 5.7656 2.25 8.6719 0.75 3.0469 1.4531 6.0938 2.1094 9.1875 0.65625 2.9531 1.2656 5.9062 1.8281 8.8594 0.60938 3.0469 1.125 6.1406 1.6406 9.2344 0.51562 3.0469 1.0312 6.0938 1.4531 9.1406 0.42188 3.0938 0.79688 6.1875 1.1719 9.2812s0.70312 6.2344 0.98438 9.3281 0.51562 6.2344 0.75 9.3281c0.23438 3.1875 0.42188 6.375 0.5625 9.6094 0.046875 1.1719 0.046875 2.3438 0.09375 3.5156h-63.469c-0.046875-1.0781-0.14062-2.1562-0.1875-3.2344-0.14062-2.5312-0.28125-5.0156-0.46875-7.5469-0.1875-2.7188-0.42188-5.3906-0.70312-8.1094-0.23438-2.4375-0.51562-4.875-0.84375-7.3125-0.32812-2.7188-0.70312-5.4375-1.0781-8.1094-0.32812-2.3438-0.75-4.7344-1.1719-7.0781-0.46875-2.7188-0.98438-5.4375-1.5469-8.1562-0.46875-2.25-0.9375-4.5469-1.4531-6.7969-0.60938-2.7188-1.2656-5.3906-1.9219-8.1094-0.5625-2.2031-1.125-4.3594-1.7344-6.5625-0.75-2.7188-1.5469-5.3906-2.3438-8.1094-0.65625-2.1094-1.3125-4.2188-2.0156-6.3281-0.89062-2.7188-1.8281-5.3438-2.7656-8.0625-0.75-2.0625-1.5-4.0781-2.25-6.0938-1.0312-2.6719-2.1094-5.2969-3.1875-7.9219-0.79688-1.9688-1.6406-3.8906-2.5312-5.8594-1.1719-2.6719-2.3906-5.25-3.6094-7.875-0.89062-1.875-1.7812-3.7031-2.7188-5.5781-1.3125-2.625-2.6719-5.2031-4.0312-7.7812-0.9375-1.7812-1.9219-3.5625-2.9062-5.3438-1.4062-2.5781-2.9062-5.1094-4.4062-7.5938-1.0312-1.7344-2.0625-3.4688-3.1406-5.1562-1.5938-2.5312-3.1875-4.9688-4.8281-7.4062-1.125-1.6406-2.2031-3.2812-3.3281-4.9219-1.6875-2.4375-3.4219-4.8281-5.2031-7.2188-1.1719-1.5938-2.2969-3.1875-3.5156-4.7344-1.7812-2.3438-3.6562-4.6875-5.5312-6.9844-1.2188-1.5469-2.4375-3.0469-3.7031-4.5469-1.9219-2.25-3.8906-4.5-5.8594-6.7031-1.2656-1.4531-2.5781-2.9062-3.8906-4.3125-2.0156-2.2031-4.125-4.3125-6.1875-6.4688-1.3594-1.3594-2.7188-2.7656-4.0781-4.125-2.1562-2.1094-4.3125-4.125-6.5156-6.1875-1.4062-1.3125-2.8125-2.625-4.2656-3.9375-2.25-1.9688-4.5-3.9375-6.7969-5.8594-1.5-1.2656-2.9531-2.5312-4.4531-3.75-2.2969-1.875-4.6875-3.7031-7.0781-5.5312-1.5469-1.1719-3.0938-2.3906-4.6406-3.5156-2.3906-1.7812-4.8281-3.4688-7.3125-5.1562-1.6406-1.125-3.2344-2.25-4.8281-3.3281-2.4844-1.6406-5.0156-3.2344-7.5469-4.8281-1.6875-1.0312-3.3281-2.1094-5.0156-3.1406-2.5312-1.5469-5.1562-2.9531-7.7344-4.4531-1.7344-0.98438-3.4219-1.9688-5.2031-2.9062-2.625-1.4062-5.25-2.7188-7.9219-4.0312-1.7812-0.89062-3.5625-1.8281-5.3906-2.7188-2.6719-1.2656-5.3438-2.4375-8.0625-3.6562-1.875-0.79688-3.7031-1.6875-5.5781-2.4375-2.7188-1.125-5.4844-2.2031-8.25-3.2344-1.9219-0.75-3.8438-1.5-5.7656-2.2031-2.7656-0.98438-5.5781-1.875-8.3438-2.8125-1.9688-0.65625-3.9375-1.3594-5.9531-1.9688-2.8125-0.84375-5.7188-1.6406-8.5781-2.4375-2.0156-0.5625-4.0312-1.1719-6.0469-1.6875-2.9062-0.75-5.8125-1.3594-8.7656-2.0156-2.0625-0.46875-4.0781-0.9375-6.1406-1.3594-2.9531-0.60938-6-1.0781-9-1.5938-2.0625-0.32812-4.0781-0.75-6.1406-1.0781-3.0938-0.46875-6.2344-0.79688-9.375-1.2188-1.9688-0.23438-3.9375-0.5625-5.9531-0.75-3.4219-0.32812-6.8438-0.5625-10.266-0.79688-1.7812-0.14062-3.5156-0.28125-5.2969-0.375-5.25-0.28125-10.5-0.375-15.75-0.375-5.2969 0-10.594 0.14062-15.797 0.375-1.7812 0.09375-3.5625 0.28125-5.3438 0.375-3.4219 0.23438-6.8906 0.42188-10.312 0.79688-2.0156 0.1875-3.9844 0.51562-6 0.75-3.1406 0.375-6.2812 0.75-9.375 1.2188-2.1094 0.32812-4.2188 0.75-6.2812 1.125-2.9531 0.51562-5.9062 0.98438-8.8594 1.5938-2.1562 0.42188-4.3125 0.98438-6.4688 1.4531-2.8125 0.65625-5.6719 1.2656-8.4375 1.9688-2.1562 0.5625-4.2656 1.1719-6.375 1.7812-2.7656 0.75-5.5312 1.5-8.25 2.3438-2.1094 0.65625-4.2188 1.3594-6.2812 2.0625-2.6719 0.89062-5.3906 1.7344-8.0156 2.7188-2.0625 0.75-4.125 1.5938-6.1875 2.3906-2.625 1.0312-5.25 2.0156-7.8281 3.0938-2.0625 0.84375-4.0312 1.7812-6.0938 2.6719-2.5312 1.125-5.1094 2.25-7.5938 3.4219-1.9688 0.9375-3.9375 1.9688-5.9062 2.9531-2.4844 1.2656-4.9688 2.4844-7.4062 3.7969-1.9219 1.0312-3.8438 2.1562-5.7188 3.2344-2.4375 1.3594-4.8281 2.7188-7.2188 4.1719-1.875 1.125-3.7031 2.2969-5.5781 3.4688-2.3438 1.4531-4.6875 2.9531-6.9844 4.5-1.8281 1.2188-3.6094 2.4844-5.3906 3.7031-2.25 1.5938-4.5469 3.1875-6.75 4.8281-1.7344 1.2656-3.4688 2.625-5.2031 3.9375-2.2031 1.6875-4.3594 3.375-6.5156 5.1094-1.6875 1.3594-3.3281 2.7656-4.9688 4.1719-2.1094 1.7812-4.2188 3.6094-6.2812 5.4375-1.5938 1.4531-3.1875 2.9062-4.7812 4.4062-2.0156 1.875-4.0312 3.7969-6 5.7188-1.5469 1.5-3.0469 3.0469-4.5469 4.5938-1.9219 1.9688-3.8438 3.9844-5.7188 6-1.4531 1.5938-2.9062 3.2344-4.3594 4.8281-1.8281 2.0625-3.6562 4.1719-5.4375 6.2344-1.4062 1.6875-2.7656 3.3281-4.125 5.0625-1.7344 2.1562-3.4219 4.3125-5.1094 6.5156-1.3125 1.7344-2.625 3.4688-3.8906 5.25-1.6406 2.25-3.2344 4.4531-4.7812 6.75-1.2656 1.7812-2.4844 3.6094-3.6562 5.4375-1.5469 2.2969-3.0469 4.6406-4.5 6.9844-1.1719 1.8281-2.2969 3.7031-3.4219 5.625-1.4062 2.3438-2.7656 4.7812-4.125 7.1719-1.0781 1.9219-2.1562 3.8438-3.1875 5.8125-1.2656 2.4375-2.5312 4.875-3.75 7.3125-0.98438 2.0156-1.9688 4.0312-2.9062 6.0469-1.1719 2.4844-2.2969 4.9688-3.375 7.5-0.89062 2.0625-1.7812 4.125-2.6719 6.2344-1.0312 2.5312-2.0625 5.0625-3.0469 7.6406-0.79688 2.1562-1.6406 4.2656-2.3906 6.4219-0.9375 2.5781-1.7812 5.1562-2.625 7.7812-0.70312 2.2031-1.4531 4.4062-2.1094 6.6094-0.79688 2.625-1.5 5.2031-2.25 7.8281-0.60938 2.25-1.2656 4.5469-1.8281 6.8438-0.65625 2.625-1.2656 5.2969-1.8281 7.9219-0.51562 2.2969-1.0312 4.6406-1.5 7.0312-0.51562 2.6719-0.98438 5.2969-1.4531 7.9688-0.42188 2.3906-0.84375 4.7812-1.1719 7.2188-0.375 2.6719-0.70312 5.3438-1.0312 8.0156-0.28125 2.4375-0.60938 4.9219-0.84375 7.4062-0.23438 2.6719-0.42188 5.3906-0.60938 8.0625-0.1875 2.5312-0.375 5.0625-0.46875 7.5938l-0.14062 1.9688h-63.422c0.046875-1.2188 0.046875-2.4375 0.09375-3.6562-0.1875-2.625 0-5.6719 0.23438-8.7188zm373.97-196.64c-118.12 0-214.97 92.906-221.26 209.53h-65.859c0-0.46875 0-0.9375 0.046876-1.3594 6.4688-244.08 206.81-440.48 452.16-440.48s445.69 196.4 452.16 440.21z"/>
  </svg>
)

export default function ViewProfile() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [acting, setActing] = useState(false)

  const { profile, isMatch, conversationId } = location.state || {}

  if (!profile) {
    navigate('/likes', { replace: true })
    return null
  }

  const visibilitySettings = profile.visibility_settings || {}
  const ALWAYS_VISIBLE = new Set(['full_name', 'dob', 'photos', 'bio', 'conversation_starter'])
  const showField = (fieldId) => {
    if (ALWAYS_VISIBLE.has(fieldId)) return true
    return visibilitySettings[fieldId] !== false
  }

  const age = calcAge(profile.dob)
  const photos = (profile.photos || []).filter(u => u.startsWith('http'))

  const infoParts = [
    showField('dob') && age,
    showField('pronouns') && filterPreferNotToSay(profile.pronouns).join('/'),
    showField('gender_identity') && profile.gender_identity,
    showField('sexual_identity') && profile.sexual_identity,
    showField('gender_expression') && profile.gender_expression,
    showField('height') && profile.height,
    showField('location') && profile.location,
  ].filter(Boolean)
  const infoLine = infoParts.join(' | ')

  const lookingForParts = [
    ...(showField('connection_goals') ? filterPreferNotToSay(Array.isArray(profile.connection_goals) ? profile.connection_goals : [profile.connection_goals]) : []),
    ...(showField('relationship_style') ? filterPreferNotToSay(Array.isArray(profile.relationship_style) ? profile.relationship_style : [profile.relationship_style]) : []),
  ].filter(Boolean)
  const lookingForLine = lookingForParts.join(' | ')

  const handlePhotoTap = (e) => {
    if (photos.length <= 1) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mid = rect.left + rect.width / 2
    if (e.clientX < mid) {
      setActivePhotoIndex(prev => (prev - 1 + photos.length) % photos.length)
    } else {
      setActivePhotoIndex(prev => (prev + 1) % photos.length)
    }
  }

  const handleGoToChat = () => {
    if (conversationId) {
      navigate(`/chat/${conversationId}`)
    } else {
      navigate('/messages')
    }
  }

  const handleLikeBack = async () => {
    if (!user?.id || acting) return
    setActing(true)
    try {
      await recordLike(user.id, profile.id, profile.likeType)
    } catch (err) {
      console.error('Error liking back:', err)
    }
    navigate(-1)
  }

  const handlePass = () => {
    navigate(-1)
  }

  return (
    <div className="view-profile-container">
      {/* Back button */}
      <div className="view-profile-header">
        <button className="back-arrow-button" onClick={() => navigate(-1)} aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"></path>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span className="back-label">Back</span>
        </button>
      </div>

      <div className="view-profile-scroll">
        {/* Photos */}
        <section className="profile-photo-section">
          {photos.length > 0 ? (
            <div className="main-photo-container" onClick={handlePhotoTap}>
              {photos.map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt={profile.full_name}
                  className={`main-photo${i === activePhotoIndex ? ' active' : ''}`}
                />
              ))}
              {photos.length > 1 && (
                <div className="photo-indicators">
                  {photos.map((_, i) => (
                    <div
                      key={i}
                      className={`photo-dot${i === activePhotoIndex ? ' active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setActivePhotoIndex(i) }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="profile-photo-placeholder">
              <div className="avatar-placeholder-large">
                {profile.full_name?.charAt(0).toUpperCase() || '?'}
              </div>
            </div>
          )}
        </section>

        {/* Profile content */}
        <section className="profile-content">
          <div className="profile-header-row">
            <h1 className="profile-name">{profile.full_name}</h1>
          </div>
          {infoLine ? <p className="profile-info-line">{infoLine}</p> : null}

          <div className="profile-sections">
            {lookingForLine && (
              <div className="profile-section">
                <h3 className="section-header">LOOKING FOR:</h3>
                <p className="section-text">{lookingForLine}</p>
              </div>
            )}

            {profile.bio && (
              <div className="profile-section">
                <h3 className="section-header">BIO:</h3>
                <p className="section-text">{profile.bio}</p>
              </div>
            )}

            {profile.conversation_starter && (
              <div className="conversation-starter-box">
                <h3 className="section-header">CONVERSATION STARTER:</h3>
                <p className="section-text">{profile.conversation_starter}</p>
              </div>
            )}

            {/* About Me */}
            <div className="profile-section">
              <h3 className="section-header">ABOUT ME:</h3>

              {((showField('job_title') && profile.job_title) ||
                (showField('location') && profile.location) ||
                (showField('hometown') && profile.hometown) ||
                (showField('pets') && profile.pets?.length > 0)) && (
                <div className="about-me-category">
                  <h4 className="section-header">WORK &amp; LIFE</h4>
                  <div className="category-items">
                    {showField('job_title') && profile.job_title && (
                      <span className="category-item">
                        <span className="category-label-inline">Job</span>
                        <span className="category-value">{profile.job_title}</span>
                      </span>
                    )}
                    {showField('location') && profile.location && (
                      <span className="category-item">
                        <span className="category-label-inline">Lives in</span>
                        <span className="category-value">{profile.location}</span>
                      </span>
                    )}
                    {showField('hometown') && profile.hometown && (
                      <span className="category-item">
                        <span className="category-label-inline">From</span>
                        <span className="category-value">{profile.hometown}</span>
                      </span>
                    )}
                    {showField('pets') && profile.pets?.length > 0 && (
                      <span className="category-item">
                        <span className="category-label-inline">Pets</span>
                        <span className="category-value">{(Array.isArray(profile.pets) ? profile.pets : [profile.pets]).join(', ')}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {((showField('height') && profile.height) ||
                (showField('children') && profile.children && profile.children !== 'Prefer not to say') ||
                (showField('political_alignment') && profile.political_alignment && profile.political_alignment !== 'Prefer not to say' && profile.political_alignment !== 'Prefer not to share') ||
                (showField('zodiac_sign') && profile.zodiac_sign)) && (
                <div className="about-me-category">
                  <h4 className="section-header">IDENTITY</h4>
                  <div className="category-items">
                    {showField('height') && profile.height && (
                      <span className="category-item">
                        <span className="category-label-inline">Height</span>
                        <span className="category-value">{profile.height}</span>
                      </span>
                    )}
                    {showField('children') && profile.children && profile.children !== 'Prefer not to say' && (
                      <span className="category-item">
                        <span className="category-label-inline">Family plans</span>
                        <span className="category-value">{profile.children}</span>
                      </span>
                    )}
                    {showField('political_alignment') && profile.political_alignment
                      && profile.political_alignment !== 'Prefer not to say'
                      && profile.political_alignment !== 'Prefer not to share' && (
                      <span className="category-item">
                        <span className="category-label-inline">Politics</span>
                        <span className="category-value">{displayPolitical(profile.political_alignment)}</span>
                      </span>
                    )}
                    {showField('zodiac_sign') && profile.zodiac_sign && (
                      <span className="category-item">
                        <span className="category-label-inline">Zodiac</span>
                        <span className="category-value">{profile.zodiac_sign}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {(showField('smoking') || showField('drinking') || showField('marijuana') || showField('drugs')) &&
             (profile.smoking || profile.drinking || profile.marijuana || profile.drugs) && (
              <div className="profile-section">
                <h3 className="section-header">VICES:</h3>
                <div className="about-me-category">
                  <div className="category-items">
                    {showField('smoking') && profile.smoking && (
                      <span className="category-item">
                        <span className="category-label-inline">Smoke</span>
                        <span className="category-value">{profile.smoking}</span>
                      </span>
                    )}
                    {showField('drinking') && profile.drinking && (
                      <span className="category-item">
                        <span className="category-label-inline">Drink</span>
                        <span className="category-value">{profile.drinking}</span>
                      </span>
                    )}
                    {showField('marijuana') && profile.marijuana && (
                      <span className="category-item">
                        <span className="category-label-inline">Marijuana</span>
                        <span className="category-value">{profile.marijuana}</span>
                      </span>
                    )}
                    {showField('drugs') && profile.drugs && (
                      <span className="category-item">
                        <span className="category-label-inline">Drugs</span>
                        <span className="category-value">{profile.drugs}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Spacer so content clears the sticky action bar */}
        <div className="view-profile-action-spacer" />
      </div>

      {/* Sticky action bar */}
      <div className="view-profile-actions">
        {isMatch ? (
          <button className="view-profile-chat-btn" onClick={handleGoToChat}>
            Go to chat
          </button>
        ) : (
          <div className="view-profile-like-buttons">
            <button
              className="action-btn btn-pass"
              aria-label="Pass"
              onClick={handlePass}
              disabled={acting}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {profile.likeType === 'friendship' ? (
              <button
                className="action-btn btn-wave"
                aria-label="Friends"
                onClick={handleLikeBack}
                disabled={acting}
              >
                <RainbowIcon />
              </button>
            ) : (
              <button
                className="action-btn btn-like"
                aria-label="Like"
                onClick={handleLikeBack}
                disabled={acting}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
