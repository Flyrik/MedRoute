# MedRoute — instructions produit

## Vision

MedRoute est le "GPS de ton parcours de soin". L'utilisateur décrit ses symptômes en langage naturel, et l'application génère un parcours de soin personnalisé, visualisé étape par étape, avec les coûts estimés et les praticiens disponibles près de chez lui.

Le "wow factor" est visuel et immédiat : comme le projet solaire qui animait les panneaux sur le toit, MedRoute anime le parcours qui se construit devant l'utilisateur, étape par étape, comme une installation en temps réel.

---

## Utilisateurs cibles

### B2C — grand public
Toute personne confrontée à un nouveau symptôme ou une pathologie chronique qui ne sait pas par où commencer.
Problème : "J'ai mal au dos depuis 3 semaines, je vois qui ? Dans quel ordre ? Combien ça va me coûter ?"

### B2B — assurances et mutuelles
Les assureurs veulent réduire les consultations inutiles et les mauvaises orientations.
Ils achètent MedRoute en marque blanche pour leurs assurés.

---

## Fonctionnalités MVP (30 jours)

### 1. Saisie des symptômes
- Formulaire de saisie en langage naturel (textarea libre)
- Champs complémentaires : âge, sexe, ville, mutuelle (optionnel)
- Durée des symptômes, intensité (slider 1-10)
- Antécédents médicaux connus (tags)

### 2. Analyse IA
- Triage différentiel : l'IA génère 2-3 hypothèses cliniques avec probabilité
- Niveau d'urgence : non urgent / urgent / urgence absolue
- Si urgence absolue : bloquer l'UI et afficher "Appelez le 15"
- Hypothèses présentées avec explication vulgarisée

### 3. Génération du parcours
- Liste ordonnée d'étapes : consultation généraliste → spécialiste → examens → suivi
- Chaque étape : type de praticien, raison, délai estimé, coût estimé
- Le parcours s'anime étape par étape à l'affichage (300ms entre chaque)
- Possibilité d'éditer : ajouter / supprimer une étape

### 4. Carte des praticiens
- Pour chaque étape nécessitant un praticien : carte Mapbox centrée sur la ville de l'utilisateur
- Markers : praticiens disponibles, colorés par secteur (1 = vert, 2 = orange, non conventionné = rouge)
- Délai de prochain RDV disponible affiché sur le marker
- Click sur marker → infos + lien Doctolib (mockées en MVP)

### 5. Dashboard financier
- Coût total estimé du parcours
- Part remboursée sécu (taux standards)
- Reste à charge estimé
- Si mutuelle renseignée : estimation remboursement complémentaire
- Tout recalcule en temps réel si l'utilisateur modifie le parcours

### 6. Export PDF
- Bouton "Télécharger mon parcours"
- PDF généré côté serveur (Puppeteer)
- Contenu : résumé des symptômes, hypothèses, étapes du parcours, tableau financier
- Design professionnel, pas un simple print

---

## Fonctionnalités post-MVP (backlog)

- Rappels par email/push pour chaque étape du parcours
- Suivi de parcours : marquer une étape comme "complétée"
- Intégration agenda pour bloquer les créneaux
- Partage du parcours avec un proche
- Version B2B : dashboard assureur avec métriques agrégées
- Multilingual (EN, ES pour expansion)
- Mode "deuxième avis" : comparer plusieurs parcours possibles

---

## Règles métier critiques

### Sécurité médicale
- Toujours afficher un disclaimer : "MedRoute ne remplace pas un avis médical"
- Si symptômes évocateurs d'urgence (douleur thoracique, AVC, etc.) : afficher "Appelez le 15" en priorité absolue
- Les hypothèses IA sont des orientations, pas des diagnostics
- Ne jamais utiliser le mot "diagnostic" dans l'UI

### Données de santé
- Conformité RGPD obligatoire
- Certification HDS (Hébergement Données de Santé) requise avant lancement commercial
- Les données de santé ne doivent jamais apparaître dans les logs
- L'utilisateur peut supprimer toutes ses données en un clic

### Qualité de l'IA
- Si l'IA a une confiance < 60% sur le triage, afficher un message "Vos symptômes sont complexes, nous recommandons une consultation directe avec un médecin généraliste"
- Les sources médicales utilisées pour le RAG : HAS (Haute Autorité de Santé), Ameli, Orphanet
- Pas de Pubmed ou sources anglaises en MVP (risque de traduction incorrecte)

---

## UX / Design

### Principes
- Sobre et rassurant, pas clinique. Penser Doctolib meets Linear.
- Couleurs : vert médical (#1D9E75 comme accent principal), fond blanc, textes gris foncé
- Typographie : Inter pour l'UI, pas de serif
- Zéro jargon médical dans l'UI — tout doit être compréhensible par un non-médecin

### Animations clés
- Le parcours se "construit" étape par étape (comme les panneaux solaires du projet de référence)
- Les coûts s'incrémentent en temps réel quand on ajoute une étape
- Transition fluide entre les étapes de l'onboarding (symptômes → analyse → parcours)

### États de l'UI
- Loading : skeleton loaders, jamais de spinner seul
- Erreur : message explicite + action suggérée
- Urgence médicale : écran full avec fond rouge, bouton "Appeler le 15"
- Vide (pas de symptômes) : onboarding avec exemples de cas d'usage

---

## Métriques de succès MVP

- Temps de génération d'un parcours < 8 secondes
- Taux de completion du flow (saisie → parcours affiché) > 70%
- NPS utilisateur > 40 après 1 semaine
- 0 incident de sécurité sur les données de santé
