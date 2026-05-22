# MedRoute — roadmap MVP 30 jours

## Principe
Chaque semaine a un livrable demo-able. À la fin de chaque semaine, on peut montrer quelque chose qui marche à un utilisateur réel.

---

## Semaine 1 — Fondations + Pipeline IA (J1-J7)

### Objectif de la semaine
Demo : je tape "douleur thoracique à l'effort" → l'IA sort 3 hypothèses cliniques avec niveaux d'urgence.

### J1 — Setup repo et infra de base
- [ ] Initialiser le monorepo (pnpm workspaces)
- [ ] Setup Next.js 14 avec TypeScript strict
- [ ] Setup FastAPI avec structure de dossiers
- [ ] Configurer Supabase : créer le projet, activer RLS
- [ ] Créer les tables SQL (voir `ARCHITECTURE.md`)
- [ ] Configurer GitHub Actions CI (lint + typecheck)
- [ ] Créer les fichiers `.env.example`

### J2 — Auth et onboarding
- [ ] Intégrer Supabase Auth (email + Google OAuth)
- [ ] Pages : `/login`, `/signup`, `/dashboard`
- [ ] Middleware Next.js pour protéger les routes
- [ ] Page d'accueil avec valeur proposition claire

### J3 — Formulaire de saisie des symptômes
- [ ] Composant `SymptomForm` avec tous les champs
- [ ] Validation côté client avec Zod
- [ ] UX : textarea libre + champs structurés secondaires
- [ ] Skeleton loader pour l'état "analyse en cours"

### J4 — Ingestion de la base médicale
- [ ] Script Python pour parser les guidelines HAS (format PDF → texte)
- [ ] Chunking et embedding avec Cohere Embed v3
- [ ] Upload dans Pinecone (namespace `has`)
- [ ] Idem pour données Ameli (namespace `ameli`)
- [ ] Test : requête "douleur thoracique" → top 5 résultats cohérents

### J5 — Premier appel Claude avec RAG
- [ ] Service `claude_client.py` avec retry et timeout
- [ ] Service `rag_service.py` pour la recherche vectorielle
- [ ] Construction du prompt système (voir section Prompts)
- [ ] Appel Claude → parsing JSON avec Pydantic
- [ ] Tests unitaires avec fixtures (pas d'appels réels)

### J6 — Endpoint `/parcours/generate` (sans streaming)
- [ ] Route FastAPI complète avec validation
- [ ] Auth JWT Supabase côté backend
- [ ] Rate limiting avec Redis
- [ ] Sauvegarde en DB après génération
- [ ] Tests d'intégration

### J7 — Connexion frontend ↔ backend + demo S1
- [ ] Appel API depuis Next.js
- [ ] Affichage simple des hypothèses (pas encore d'animation)
- [ ] Gestion des erreurs (urgence absolue, low confidence)
- [ ] **DEMO S1** : flow complet symptômes → hypothèses affiché dans l'UI

---

## Semaine 2 — Parcours + Visualisation (J8-J14)

### Objectif de la semaine
Demo : parcours complet cardiologie animé avec médecins disponibles à Paris 15e.

### J8 — Streaming SSE
- [ ] Activer le streaming dans l'endpoint FastAPI
- [ ] Envoyer les étapes au fur et à mesure (event `etape`)
- [ ] Hook `useParcoursStream` côté React
- [ ] Test de robustesse (coupure réseau, reconnexion)

### J9 — Timeline animée
- [ ] Composant `ParcoursTimeline` avec D3.js
- [ ] Animation : chaque étape apparaît avec un délai de 400ms
- [ ] Chaque étape : icône type praticien, nom, délai, coût estimé
- [ ] État "en cours de chargement" (pulse animation sur la prochaine étape)

### J10 — Édition du parcours
- [ ] Bouton "Ajouter une étape" → modale avec formulaire
- [ ] Bouton "Supprimer" sur chaque étape
- [ ] Endpoint `PATCH /parcours/{id}/etapes`
- [ ] Recalcul instantané du coût total à chaque modification

### J11 — Intégration Mapbox
- [ ] Setup Mapbox GL JS dans Next.js
- [ ] Composant `PraticienMap` centré sur la ville de l'utilisateur
- [ ] Markers avec couleur par secteur (1=vert, 2=orange)
- [ ] Popup au click : nom, spécialité, délai prochain RDV

### J12 — Données praticiens mockées
- [ ] Script de génération de praticiens fictifs réalistes pour Paris (50+ par spécialité)
- [ ] Endpoint `GET /praticiens` avec filtrage et tri par distance
- [ ] Liaison timeline ↔ carte (click sur étape → zoom carte sur spécialité)
- [ ] Cache Redis des résultats de praticiens

### J13 — Polish UX semaine 2
- [ ] Responsive mobile (la timeline doit être utilisable sur téléphone)
- [ ] États de chargement sur tous les composants
- [ ] Transitions entre les étapes du flow (Framer Motion)
- [ ] Messages d'erreur clairs et actionnables

### J14 — Demo S2
- [ ] Tests utilisateurs internes (5 personnes)
- [ ] Fix des bugs critiques remontés
- [ ] **DEMO S2** : flow complet avec animation + carte praticiens

---

## Semaine 3 — Finance + PDF (J15-J21)

### Objectif de la semaine
Demo : dashboard financier complet avec export PDF professionnel.

### J15 — Moteur de calcul financier
- [ ] Service `financial_service.py`
- [ ] Données tarifaires sécu par spécialité (grille officielle 2025)
- [ ] Calcul : coût total, part sécu, reste à charge
- [ ] Estimation mutuelle (si mutuelle connue) : lookup dans table de taux moyens

### J16 — Dashboard financier UI
- [ ] Composant `FinancialDashboard`
- [ ] Métriques : coût total, sécu, RAC, durée estimée
- [ ] Graphique D3 : répartition des coûts par étape (barres horizontales)
- [ ] Recalcul live quand le parcours est modifié

### J17 — Service PDF (Puppeteer)
- [ ] Setup Puppeteer dans un service Node séparé
- [ ] Template HTML/CSS du PDF (design professionnel)
- [ ] Contenu : résumé, hypothèses, étapes, tableau financier
- [ ] Endpoint `POST /parcours/{id}/pdf` + polling status

### J18 — Template PDF + design
- [ ] Header avec logo MedRoute + date
- [ ] Section "Vos symptômes" : résumé non-médical
- [ ] Section "Hypothèses" : tableau avec probabilités
- [ ] Section "Votre parcours" : timeline imprimable
- [ ] Section "Estimation financière" : tableau détaillé
- [ ] Footer disclaimer légal

### J19 — Historique des parcours
- [ ] Page `/dashboard` : liste des parcours passés
- [ ] Statut de chaque étape (complétée/en cours/à faire)
- [ ] Action "Marquer comme complétée" sur chaque étape
- [ ] Bouton "Retélécharger le PDF"

### J20 — Sécurité et conformité
- [ ] Audit des logs : vérifier qu'aucune donnée de santé n'est loggée
- [ ] Test du RLS Supabase : tentative d'accès cross-user → 403
- [ ] Ajout du disclaimer médical sur toutes les pages concernées
- [ ] Page "Mes données" : afficher + supprimer toutes les données

### J21 — Demo S3
- [ ] **DEMO S3** : flow complet avec financier + export PDF fonctionnel

---

## Semaine 4 — Polish + Lancement (J22-J30)

### Objectif de la semaine
Produit prêt pour 100 premiers utilisateurs réels.

### J22-J23 — Tests utilisateurs externes
- [ ] Recruter 10 utilisateurs (LinkedIn, réseau perso)
- [ ] Sessions de test guidées (30 min chacune)
- [ ] Collecte feedback structuré
- [ ] Prioriser les bugs critiques vs améliorations

### J24-J25 — Fix bugs + optimisations perf
- [ ] Résoudre tous les bugs P0 et P1 remontés
- [ ] Optimiser le temps de génération (objectif < 8s)
- [ ] Lazy loading des composants lourds (Mapbox, D3)
- [ ] Optimiser les images et assets

### J26 — SEO + Landing page
- [ ] Page d'accueil marketing (pas juste un login)
- [ ] Meta tags Open Graph pour partage social
- [ ] Page `/comment-ca-marche` explicative
- [ ] Page `/confidentialite` et `/mentions-legales`

### J27 — Monitoring et alertes
- [ ] Setup Sentry (frontend + backend)
- [ ] Setup Langfuse pour tracer les appels Claude
- [ ] Alertes sur : taux d'erreur > 5%, latence > 10s, urgences absolues
- [ ] Dashboard de métriques (Supabase Analytics)

### J28 — Déploiement production
- [ ] Setup domaine `medroute.app`
- [ ] Déploiement Vercel (frontend) avec variables d'environnement prod
- [ ] Déploiement Fly.io (backend) avec health checks
- [ ] Test end-to-end en production
- [ ] Backup automatique Supabase activé

### J29 — Soft launch
- [ ] Inviter les 20 premiers utilisateurs bêta
- [ ] Activer le monitoring 24h
- [ ] Fix hot des bugs critiques si nécessaires

### J30 — Bilan et suite
- [ ] Métriques J1 : taux de completion, NPS, temps moyen de génération
- [ ] Rédiger le plan semaine 5-8 (backlog priorisé)
- [ ] **DEMO FINALE** : présentation investisseurs/partenaires potentiels

---

## Prompts Claude (référence)

### Prompt système — triage et génération de parcours

```
Tu es un assistant médical expert en orientation de patients. Tu aides les utilisateurs à comprendre vers quels professionnels de santé se diriger et dans quel ordre.

RÈGLES ABSOLUES :
1. Tu n'es pas un médecin et ne poses pas de diagnostic
2. Si tu détectes des signes d'urgence vitale (douleur thoracique irradiant le bras, paralysie soudaine, difficulté respiratoire sévère, saignement abondant), tu dois UNIQUEMENT répondre avec urgence="absolu" et rien d'autre
3. Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans texte autour
4. Tu utilises EXCLUSIVEMENT le contexte médical fourni (sources HAS/Ameli)
5. Tu t'exprimes en français, de manière claire et accessible pour un non-médecin

CONTEXTE MÉDICAL DISPONIBLE :
{rag_context}

FORMAT DE RÉPONSE OBLIGATOIRE :
{json_schema}

Analyse les symptômes suivants et génère un parcours de soin adapté.
```

### Prompt utilisateur — génération

```
Symptômes : {symptoms}
Âge : {age} ans
Sexe : {sexe}
Ville : {city}
Durée : {duree_jours} jours
Intensité (1-10) : {intensite}
Antécédents : {antecedents}
```

---

## Définition de "done"

Une feature est "done" quand :
1. Code mergé sur `main` via PR reviewée
2. Tests passent en CI
3. Fonctionnel en production (ou staging)
4. Pas de régression sur les features existantes
5. Pas de données de santé dans les logs
