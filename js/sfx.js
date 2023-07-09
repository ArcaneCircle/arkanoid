import {ZZFX, zzfx} from 'zzfx'

// you can use https://killedbyapixel.github.io/ZzFX/ to generate sfx

export const playExplosionSFX = ()=> {
    if (Math.random() >=.5){
        zzfx(...[1.01,,690,.02,.3,.55,4,3.03,.8,,,,,1.8,,.2,,.5,.12,.11])
    } else {
        zzfx(...[1.02,,203,.05,.06,.52,2,4.16,.3,.4,,,,1.7,,.4,,.32,.14])
    }
}
