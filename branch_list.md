chore/project-setup

backend scaffold

frontend scaffold

env setup

Mongo connection

base Express app

React/Vite setup

linting / formatting

shared folder structure

feat/ui-foundation

reusable components

Button

Input

Card

Badge

Modal

Loader

EmptyState

ErrorState

SectionTitle

Header/Footer

base theme/colors

feat/home-page

homepage layout

hero

how it works

score demo

prize preview

featured charities section

responsive desktop/mobile

feat/charity-public-api

Charity model

charity GET routes

featured charities endpoint

filters/search

seed integration

feat/home-charity-integration

connect homepage to backend

fetch featured charities

loading/error states

feat/auth-backend

User model

register

login

logout

JWT cookie

password hashing

/me

auth middleware

feat/auth-frontend

login page

register page

auth context

protected routes

login/logout flow

error states

feat/charity-module

charity listing page

charity detail page

charity card/grid/filter

select charity

contribution percentage

My Charity page

feat/subscription-module

subscription model

monthly/yearly plans

simulated payment flow

subscription status

billing page

payment success/failure states

feat/score-backend

GolfScore model

add score

edit score

delete score

latest 5 logic

one-score-per-date rule

1–45 validation

feat/score-frontend

score list

add score form

edit score

score progress

empty states

duplicate-date errors

latest 5 display

feat/dashboard

subscriber dashboard

subscription summary

score summary

charity summary

next draw card

winnings card

feat/draw-engine

Draw model

DrawEntry model

random draw strategy

weighted draw strategy

match engine

3/4/5 tier logic

jackpot rollover

draw simulation

feat/draw-api

draw routes

draw detail

latest draw

user draw result

admin create/simulate/publish

feat/draw-frontend

draws page

draw detail

score vs draw number comparison

match highlighting

winner/non-winner states

feat/winner-module

Winner model

proof upload

Cloudinary integration

verification status

payout status

feat/winnings-frontend

winnings overview

winner detail

proof upload page

verification timeline

paid/pending/rejected states

feat/admin-users

admin dashboard shell

user management

user details

edit/suspend user

feat/admin-charities

charity CRUD

Cloudinary image upload

featured toggle

active/inactive state

feat/admin-draws

create draw

simulate draw

preview winners

publish draw

rollover display

feat/admin-winners

winner list

proof review

approve/reject

payout status

feat/admin-reports

total users

total prize pool

charity contribution totals

draw stats

feat/error-states

404

unauthorized

no subscription

failed payment

no draw

no score

network error

generic retry UI

test/integration

API tests

auth tests

score rules

draw engine

winner calculation

edge cases

chore/deployment

Render backend config

Vercel frontend config

production env

CORS

cookie settings

MongoDB Atlas

Cloudinary production config

release/v1-demo

final cleanup

demo credentials

README

screenshots

bug fixes only

