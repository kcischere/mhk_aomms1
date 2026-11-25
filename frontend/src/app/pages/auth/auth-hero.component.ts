import { Component, input } from '@angular/core';
import { LOGIN_BG } from './auth-bg';

// Mr. Hungry Kitchen logo (flame, fork and spatula), embedded so no extra file is needed
const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgCAMAAAC8EZcfAAAAwFBMVEXtmWNfX1/eYCmrqacpKSnnrYygoKCMjIysqqngspjSs6DtrqrU1NTwhjdXWVn37KrieE7lxq///3/6xqfIx8etqXf/f3//AADbo3j8t3H//wDtwqCrbW0sLzgRZG8JJGNzmJ4oX6NyKSlMTBh3jHStydMA/wAA//9APj+xu+X/AP8AAP8uRS44QT9CP0B0dHR7eXt5bYV/fIF//39///+Cf3i/37/Mu8wAAAAnJyf0chLxbBPqZyf+/v5+fn7tdSov3OFwAAAAQHRSTlP9/P0R/Oag3mGlWBAi/gUN/lkC91cOAgGzAwGoBQUFBQsIBAgREAEC/w4BAQv//3SfFfYCAv8IDwD+/v7+AwP+EN+OTAAAEBVJREFUeNrtXId24sgSbdGKiGRs8DiMZ2bz7su5QerW///Vq6qOEsJIGO/zO4feczxeE3SpqlsZMfHBD7sCvAK8ArwCvAK8ArwCvAK8Avy/ASiFVB9egtvy4wJ8KZInDnJcf1SAi4SxpJgKsZQfEqAUBZs0AHGJv39AgEsxTZqqahgruCg/IMCfpEpYvd/vQYpcbD+gDZZiyhoAuK9YshQP7wpQ8oUabUccACK8qtoz9k2odwTIjdWPO4+CgwQBHsmwvIy76QW4EDJN05nBOfjcC44sIYAVKz4vx7xYca5GSDCL4igbizAAuK9qNh1BZcW94k4CVIAv3u12cXY3DmELYNWAkhdDXbwQszTlosfuWQ88mUc7OiMRSgNQ63jPioEi5AgviiK43KHdswN8pOGdQZiPQajEhtUaIGKcJOWgVyuw+IxEEqXygPus++RZBs+6MyLcRWMQoh8kgACxAYcIIlwOgCfuMnM5sHveRcg6z77LYgAl8ig2CEdouYRgrOUHFlgDSAgo96fVC9cyF9vFMeisDbEFUCqyPgAlrBmOsEMleTIhhgDCum6a5iSRJWrMXslIBBTIewFKzuHZ9FlA0CK1MhzsbVDDk70GuG8A4ElPA6LKO/gAYfuCrMUOmdLT42y2kM4w4AVDotZ3W+LwnlQMAPf7+gSPOV4v3u0OEOYBm1lAJRCu1CKMMullH4NA5XALNH6wwXhXiPVr+LgXXxwABRZ4NbMgeEQp/EMfiYii3bUxi5MIt5ANTgyFzXkd4AJFEDuptVSNajaXZEZ+OaDRsLSSkSizzH6iVHJ5io0bSgZDgPvXAHJ0GF6p8q5li57NAFAuFgthVAuwzDMj7n4l5PyEN/t6y1YEcD8IIDeS0Bqaea/RZTPTV5ba8cUZhM/cEMX9etphA76CIW+dDVoVl8dewL1zzi05OwiJzYzY4dxKlAkDC/QKj+eBszlG5e/heb9ivQSnA3B6xHaldWh4GSLLIZlNOsXQEwFpF5q/WpmpiYwA1n40eMoRM1x8X4qfnxjAajC+BQAbVvaXJlI5J4aEzXvgEbEBjGL4KErLUgIRSmeRCyf840p+FmXBAsuz8qtWCT9mgNb/kePIevGZi7LMssAaHLLDgAXr+Mwdwrt+fT2Af2H7w4NJdX+ywJ1tB5c9gjBlBr5/KrCDW/6SO7LW0m+GM6qGewBCICl7P5KyBkiKu8tewQdPYS459UTx7EDLc+6w1wxLsUzmkBrUXXgNpNQ/Qh0Fn3DZBWgUjPGK9+KLvAti1shAcCY0WqIEYC3hDsxQovzqBnKXjhAb4nDZL0B/xVmv/UXernIWCsgGbyJKGjlW58eIsgZ8K5DfoYob4DCFcBBS29koK5JoJmQW9ak1FamNsjMmQwEpS+WZ+GypPPOkoyynFX95MjeepYsRKPJzqZOwpJAydIHRCYJkUlqJpIKBXTm4PhRnUpm8AZ6uuE2L2kqWskT+Vr0U2RsNfycSbISUBxSOZmoW9fIi9zKbgaOWPipGs4VmB3hxQKipbIgSmw8XMBkTrEk/vqZiiRY2AJyzhC9t7m9shzxgGvV6Fukdh1RMuMiBf8C8psMOzQ2re8hrQoJM6uoIQkuRRwA48UEZU04rwLu+CILezIQWHUm02cY+awnZEbDavFvmOzFQgjCdHRxCBB/zHwjSdBL0ODbntSYIsnBMaAtw5tM8EKBkrdRiFySqEFFsKIa/LtwHt1a4hBLElHDVAUZKZL6j533BQoAlL9KkqSZvSgFp3Bvc2tGVtWMjArAIQdY2FONfs7anwT7HSvcQegDWLL+XptvAsMizGlfWyPO+HIFiS+7jtPIZtTdDvjAyhipaCZvkpKlzDpolG3Fja7heEyx1rrqUKGeKy1uTSFuAPRoOkhbtJy3AwKX7QGfYEbWKGlCNdBSuqyP4qoa96Jp9bUqpiRGhByizXvn9I4sCIK5o4p3k2UeUjjONDUt+881KD8v/Mv+kP8dWlMj0ioxSmgsZG4z6MtRAlZLcOwv8pzdD56ywI5b1AVyLHGoka3oHZggAH5yrpMfmEPkeA0JmMjqQX4DPGTs7TCLBE33+DFVUrJ1SP0AcitROapYsAcD7BxPnCF8NOr4Bu0U/aIy5G4ZRvz86DM7WWStLi732Z5YdWfQaQCNA/DEP0taGJKiE0rGw0snNMnDUrVJ9F/+CDs7XTlFmIxYL8lxfyORB7Ii7n3OhdfeJeZsjniaQGDohgkJnzw9fnly3xvJYicN2R6wr9ZkPfeiiD7pbQakKtsd7axlXIT+IT/MqgLffJ9MpcwAB7hd4Fsbqve2qJ8RrdfC+MVae5H49vvyw9dEmSkZE6fP0XL+0dAA1PzDcThOfWDfsaVkafLpZM9cAkXVxO3smeDMv2DhsSrJuteVDdm82GUlbKhWsDbBUf4PQEtSccALuOIAurFvu3sEf89DUHUH6Oqw2Nf1zlPclQ3FqZuqlBUj93ko3EQoWto7aSaxVsXBVrZFE+pe/ZlCa7+JdbxejDVAuAkf0S3+hyk2qgLV65QHeyBKb/GFjoe3FHcBF0JYhFZND2/Xj6+nyp1F8vAzMbO6+wVzGAKxqSAY4Vm83LOwdmVaDz2/4QdjqEcHdKz3qth3uejW8sH7wV9cwR4gAUD3Kfyesakc9r2/wgw+22Tw7donDNv8BQOppRUcBOvFvgcZ7k64agJRjHytSgipUHZNB1O2g94/CeEj5YzboWKIxaoAQoctb1vQCrG0C5jOktq+OIwrGfMAwkVPzPd71Z+SSu4R6UtmOZc2W9NZAlIKxnjIUsv5FWdrWlk1L6MTgqSPjDfnJUZjt+Evsynk5xlbrLh+UcpN4gE6BkA+Amuf1gRSxLDEJl29t3eXgAOGk+d2MfPjgiTtKY5anaWROmrpSNdfBmMYiAUCTMQsForxJGMaQVsMGQnXBxXrLw5S+fc0R82J8OsGYzWacww/huwDZTNE7re8hZTWOEL3ciy9Hxcu0ACnWdRN4wSJJkimQy9dsM8U5X9DhUo5fqlDwYtdGVQtXTVsmly+6bq9qCnVLabsH1M4CRZMEK0RZUZkMci02vmc7bIJ1YutDcjoyrE0tk6lwR35ia9qm9LbpgLNjWgGhzlLFbuHRRZHcFmlQlF92LSVocv2I783FZ0znaSqHYgT9bVuN141OBtECgCHyGfBPi+x4K+/NezMuxvwp+6cCZ8PBqJAMdaM9YWfmsMZ0kPRLCga130vbkKLOh7o0QGWbc1Qeihz0xcGujKeu64S3hbIRpTFD06yWC1/c5kOXXsZsHkmv5DsQX1EAh5a3VLU1AJAVn9sXlS8AH8fGZlPKqSDWTYPLr0a55ujuX+jUaJsEIkeD8quaSdKZ22CwAZKwWy6eWwl7nPHBe03jAPq6CjLu542xNHQoNSBZJV+pa+6tkANAZnDbMgze4O98+N7UuOWygMmWhWqNDm5V45wOAvK6ZRIKVx515012isZ32n5TgZ9Vrg+3ASGy1QT3UGRn5TEpSk0QLs8wwDPW87hvz7rYDgTgU8CYFM9ty/pJcJMhtOoxOWaxbixA16QPG+oU5PiyVOIPh5sCUrSr4UiOWtwbveDoRRGakiz7B8OPspujRnzcYuH4DczQDMNryZLfn2b/KIKcCzBMmNQws3Bd+nTsYuYZO6zSjwnSYZ8oHIuP3Tw9Z8k2UPKAnET5rlqcydGbrecADDvaJ7M6GW5ZjTXAMwGGg5VTm10hvqE56tsBBiEvfh1hgG88gd8AMGjhvIqwhS+0V/neAH31jcODY85GBlOFMwh8DkDZtzqUioU8ga+zkrFZvJsEA4R5oLw+4VCz0fYmwhU/CQna88nl0fNS/sKLIchPet1hC19rFbYUxe3gLfBREpTYG3Dl+cK3cnsIGuLrEBgHze8BECer4cJd2EY7yFFUS34tfJCC4/s8XBzgAw5gkwCJClq5HWcT8gP3CEIWPWxvWJO8Q9lZiic2aelGtVkq++IvOZgWmgdRzGv25fIsLnE2PQ8/etCLpMxGOvkF673dDEHivjqOVZ63QxzjIICPaHePS2r6tpYWld+tC6jc4m8ctRsOSi6gnEdNuEbkRST4GUWIa27t8pz7tX+HULZGGR3jVPTltv2EFeXXkvOLSFBhWZlQpwjXt+dY6Mqe+Z4lKw/xdcYeW6xEsU8yYQnOypLi1HrxAIDPYDTzZrVqGt3UxVaBlwqJCw9OLZHiQQEXd7uAEvsQuulZT3BnjiWbt0sQu1QT6qPSAjx+ba7YiPXy0RHFNLJJyZyWYl1vO9QvX2InZ9Lo6VRdU9tTvV2CYi0LhmMtOHOzeXebI7a1HgDPUntytLE89f8vrTE8KloRSBjKbT7fV6iMpkmmp75yMgQgp0Yf4YOzN0Kcou7KzVaFMeu+LzPbrvW3UadTxibYp2P6+4H4Nmp7CRaDCFf4zvDZGZgjjQnRwPPQ227Kh/KRavXlA/y6XMI/5dp2u77ym4KxGr9n4vC5Fb43A6TlDVx/obefz/X7z3H0MeWcl4CGf/0GaL+9fOu+9gsv+RQ7NxpebT8ivUNy+nsWbGCUK1A5E/gPhcjmZoKJv6Oz0F5IO6NPnz7BXz7ZwxLyJ3P6uhiJbx7s+kt5GUctIUNaTVDL8IOG/doWaSLXGP70H5wZV9WE+sT0Sj9CHiLAoZHEKHlCCLUUSSyNXvgNto+qys1ow9OY1zRNHe5Ari+WLGxQyZOJQahNffyZ+ykofjFQLsXFACpSMlqhRoluZ2WvmyS3R4+OkaytXD2fLR/XlwOoB18TDdCemmQZIDV0STpym2sr7Yxnp2LI12eH54MSJ1/aCl89hLrqW/1ubzEXL4OqkhEAhWbyASAHzKLzELsw3QS5YskPjxceJtLeOTuQlvlxIMO6f3XUjbeHdoLHlJ2lRli3obh/HFDKU/avnAqHTwMbSaPq4jUiXFlYDmHdkaHR8dEFXMgRysHf3h7X+qCh9GpSeUAAxADyJvmKitFlQ5bxg9iIdwGIM5spGWIdqLqqOzKsqiM61vimfxzx7fexzaN7MMQnmnsZiFV1jCVNZzdK5wrJ02bUDRLG9wfh/Uuaza1OOcO27Bry43QzlXfusKJ7WFCK14oYq+D0BmIAV9rXv3MLeGsGXDfTHE7x2nmCA/9Mpzfm7hdjb19x7s1IyhInm/mUDqTM05tp+9wEf8j5FIus9fKMW6icf7cUcoo4sB6UaEGlet5Nct4GcPV62uC/yTHB+u3+9wX4m5glK58c1C0X4zIG6xFH3fnjMgD1PY66PrrrDE3Mmyc/iPvfG6CSG0yyqRqt66ruOfgQSfD1r+O/E0BTjPrC6EDF9oG6Sfi5N/B5C8CtHEQTXKiZnn0bqTfdlIm2fttnxZKkx8fws2/E9ba7Rinx9YYO+OVSrxreBAfdNZxy8YZLvPG2VtuLPu0dAIr75XK5KeEs+XartkqVIMnNZsPxJz62WUou/ncSfP9zBXgFeAV4BXgFeAV4BXgFeAX4rue/3GohARkQz10AAAAASUVORK5CYII=';

/**
 * Left-hand photo panel shared by the login, sign-up and staff login pages.
 * Sizes itself from its own width/height (container units), so the headline,
 * logo and spacing scale with any screen. On phones it becomes a short banner.
 */
@Component({
  selector: 'app-auth-hero',
  standalone: true,
  template: `
    <img class="photo" [src]="bg" alt="" />
    <div class="shade"></div>
    <div class="stripe"></div>

    <div class="brand">
      <span class="logo-tile"><img [src]="logo" alt="Mr. Hungry Kitchen" /></span>
      <span class="brand-text">
        <b>mr. hungry</b>
        <small>KITCHEN</small>
      </span>
    </div>

    <div class="caption">
      <span class="badge">{{ badge() }}</span>
      <h2>Good food,<br />Great moments,<br /><span class="hl">Happy memories!</span></h2>
      <span class="script">Satisfy Every Craving</span>
      <p>Cooked with care · Mr. Hungry Kitchen</p>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: sticky;
      top: 0;
      align-self: start;
      height: 100vh;
      height: 100dvh;
      overflow: hidden;
      container-type: size;
      background: #121212;
      color: #fff;
      font-family: Inter, 'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif;
    }

    /* The photo sits at the top and fades into the charcoal below it. */
    .photo {
      position: absolute; top: 0; left: 0;
      width: 100%; height: 74%;
      object-fit: cover; object-position: center top;
      -webkit-mask-image: linear-gradient(180deg, #000 68%, transparent 100%);
      mask-image: linear-gradient(180deg, #000 68%, transparent 100%);
    }
    .shade {
      position: absolute; inset: 0;
      background:
        radial-gradient(520px 360px at 0% 100%, rgba(242, 106, 20, .30), transparent 65%),
        linear-gradient(180deg,
          rgba(10, 10, 10, .6) 0%, rgba(10, 10, 10, 0) 18%,
          rgba(10, 10, 10, 0) 50%, rgba(10, 10, 10, .65) 100%);
    }
    /* Orange stripe on top, like the logo's stripes */
    .stripe {
      position: absolute; top: 0; left: 0; right: 0; height: 6px;
      background: linear-gradient(90deg, #f26a14, #ff8a2a);
      box-shadow: 0 2px 0 #0b0b0b;
    }

    .brand {
      position: absolute;
      top: clamp(22px, 5cqh, 50px);
      left: clamp(24px, 7cqw, 48px);
      display: flex; align-items: center; gap: 14px;
    }
    .logo-tile {
      width: 58px; height: 58px; padding: 6px; border-radius: 17px;
      background: linear-gradient(145deg, #fbfaf8, #e8e5e0);
      box-shadow: 0 8px 22px rgba(0, 0, 0, .45), inset 0 1px 0 #fff;
      display: grid; place-items: center; flex: none;
    }
    .logo-tile img { width: 100%; height: 100%; object-fit: contain; display: block; }
    .brand-text { display: flex; flex-direction: column; line-height: 1.1; }
    .brand-text b {
      font-size: 18px; font-weight: 900; letter-spacing: .05em; text-transform: uppercase;
    }
    .brand-text small {
      font-size: 10px; letter-spacing: .34em; font-weight: 800; color: #ff8a2a; margin-top: 4px;
    }

    .caption {
      position: absolute;
      left: clamp(24px, 7cqw, 56px);
      right: clamp(24px, 7cqw, 56px);
      bottom: clamp(24px, 5cqh, 56px);
    }
    .badge {
      display: inline-block;
      background: linear-gradient(135deg, #ff8a2a, #e8590a); color: #fff;
      font-size: 11.5px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase;
      padding: 7px 11px; border-radius: 6px;
      box-shadow: 0 6px 16px rgba(242, 106, 20, .4);
    }
    h2 {
      margin: 16px 0 12px;
      font-size: clamp(26px, min(8.2cqw, 7.2cqh), 64px);
      line-height: 1.12; font-weight: 900; letter-spacing: -.02em; color: #fff;
    }
    h2 .hl { color: #ff8a2a; }
    .script {
      display: block;
      margin: 0 0 16px;
      font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive;
      font-size: clamp(14px, 2.4cqw, 18px);
      color: #e6e6e6;
    }
    p {
      margin: 0; font-size: 12px; letter-spacing: .06em; text-transform: uppercase;
      color: rgba(255, 255, 255, .85);
    }

    /* Short screens (e.g. a laptop with a small window or a phone on its side) */
    @container (max-height: 560px) {
      h2 { margin: 10px 0 8px; }
      .script { margin-bottom: 10px; }
      .badge { font-size: 10.5px; padding: 5px 8px; }
    }

    /* Phones and small tablets: the photo becomes a banner above the form */
    @media (max-width: 880px) {
      :host { position: relative; height: 190px; }
      .photo {
        height: 100%;
        object-position: center 38%;
        -webkit-mask-image: none; mask-image: none;
      }
      .shade {
        background: linear-gradient(180deg, rgba(10, 10, 10, .7) 0%, rgba(10, 10, 10, .3) 100%);
      }
      .brand { top: 50%; transform: translateY(-50%); left: 24px; }
      .caption { display: none; }
    }
    /* Phone held sideways: keep the banner slim so the form stays visible */
    @media (max-width: 880px) and (max-height: 500px) {
      :host { height: 90px; }
      .logo-tile { width: 46px; height: 46px; border-radius: 14px; }
    }
  `],
})
export class AuthHeroComponent {
  badge = input('Your neighborhood favorite');
  bg = LOGIN_BG;
  logo = LOGO;
}