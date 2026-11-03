"""El orbe de la marca: esfera de cromo plateada. Dentro de la app su horizonte toma el color de tu nota ({{ orb.k }})."""


def orb_tpl(n, label=False):
    return (f'<img src="img/orb-{{{{ orb.k }}}}.png" alt="" aria-hidden="true" style="width: {n}px; height: {n}px; flex: none; border-radius: 50%; '
            f'box-shadow: 0 {max(0.5, n * 0.03):.1f}px {max(1, n * 0.08):.1f}px rgba(0, 0, 0, 0.22)">')
